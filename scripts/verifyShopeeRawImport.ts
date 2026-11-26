import * as XLSX from 'xlsx';
import {
  auditMergedItem,
  generateBlingSampleWorkbook,
  generateShopeeCommonSampleWorkbook,
  generateShopeePromoSampleWorkbook,
  mergeMarketplaceWithBling,
  parseBlingWorkbook,
  parseShopeeCommonWorkbook,
  parseShopeePromoWorkbook,
  parseStrictPriceValue,
} from '../lib/mergeMarketplaceData.ts';
import { AppSettings } from '../types.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FALHA: ${message}`);
  }
}

function assertClose(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 1e-4) {
    throw new Error(`FALHA [${label}]: esperado ${expected}, recebido ${actual}`);
  }
}

const defaultSettings: AppSettings = {
  simplesNacional: 6,
  mercadoLivre: {
    contributionMargin: 15,
    classicCommission: 12,
    premiumCommission: 17,
    productWeight: 0.5,
  },
  shopee: {
    contributionMargin: 15,
    sellerType: 'cnpj',
    highVolumeCPF: false,
    inCampaign: false,
  },
  tiktok: {
    contributionMargin: 15,
    affiliateCommission: 0,
  },
  instagram: {
    contributionMargin: 15,
    machineFeePercent: 0,
    machineFeeFixed: 0,
    pixFeePercent: 0,
    pixFeeFixed: 0,
  },
  shein: {
    contributionMargin: 15,
    commission: 18,
    productWeight: 0.5,
  },
};

// 1. Testes diretos de parseStrictPriceValue
assert(parseStrictPriceValue('Insira de 1.00 a 500000.00') === null, 'Texto de instrução deve retornar null');
assert(parseStrictPriceValue('Opcional') === null, 'Opcional deve retornar null');
assert(parseStrictPriceValue('') === null, 'Vazio deve retornar null');
assert(parseStrictPriceValue('-') === null, 'Hífen deve retornar null');
assertClose(parseStrictPriceValue('R$ 89,90') ?? -1, 89.9, 'R$ 89,90');
assertClose(parseStrictPriceValue(' 1.250,50 ') ?? -1, 1250.5, '1.250,50');
assertClose(parseStrictPriceValue('45.50') ?? -1, 45.5, '45.50');
assertClose(parseStrictPriceValue('0,00') ?? -1, 0, '0,00');

// 2. Planilha bruta da Shopee - Preço Normal (cabeçalho na linha 3, instrução na linha 6, Col E e Col G)
const rawCommonRows: any[][] = [
  ['et_title_product_id', 'et_title_product_name', 'et_title_variation_id', 'et_title_variation_name', 'et_title_sku_ref', 'et_title_parent_sku', 'et_title_price', 'et_title_stock'],
  ['sales_info', '', '', '', 'Opcional', 'Opcional', 'Obrigatório', 'Obrigatório'],
  ['ID do Produto', 'Nome do Produto', 'ID da Variação', 'Nome da Variação', 'SKU de referência', 'SKU Principal', 'Preço', 'Estoque'],
  ['', '', '', '', '', '', '', ''],
  ['Não edite', 'Não edite', 'Não edite', 'Opcional', 'Opcional', 'Opcional', 'Obrigatório', 'Obrigatório'],
  ['', '', '', '', 'Até 100 caracteres', '', 'Insira de 1.00 a 500000.00', 'Insira de 0 a 100000'],
  ['1001', 'Fone Bluetooth TWS', '2001', 'Preto', '  fone-bt-tws  ', 'PARENT-IGN', 'R$ 89,90', 30],
  ['1002', 'Garrafa Térmica Inox 1L', '2002', 'Prata', 'GARRAFA-INOX-1L', '', '99.90', 15],
  ['1003', 'Produto Sem Bling', '2003', 'Padrão', 'SKU-FORA-BLING', '', ' 49,50 ', 8],
  ['1004', 'Linha Ignorada Preço Zero', '2004', 'Zero', 'IGNORAR-ZERO', '', '0,00', 5],
];
const rawCommonWs = XLSX.utils.aoa_to_sheet(rawCommonRows);
const rawCommonWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(rawCommonWb, rawCommonWs, 'Shopee Bruta');

const parsedCommon = parseShopeeCommonWorkbook(rawCommonWb);
assert(parsedCommon.errors.length === 0, `Sem erros esperados no Preço Normal, recebeu: ${parsedCommon.errors.join('; ')}`);
assert(parsedCommon.rows.length === 3, `Esperados 3 itens válidos (ignorando instrução linha 6 e preço zero), recebeu ${parsedCommon.rows.length}`);
assert(parsedCommon.rows[0].skuNormalizado === 'FONE-BT-TWS', 'SKU Col E normalizado');
assertClose(parsedCommon.rows[0].precoComum, 89.9, 'Preço Col G linha 7');
assert(parsedCommon.rows[1].skuNormalizado === 'GARRAFA-INOX-1L', 'SKU Col E linha 8');
assertClose(parsedCommon.rows[1].precoComum, 99.9, 'Preço Col G linha 8');

// 3. Planilha bruta da Shopee - Promoção (cabeçalho linha 1, dados linha 2+, Col C prioridade c/ fallback Nº de Ref. SKU, Col H Preço de desconto)
const rawPromoRows: any[][] = [
  [
    'ID do Produto',
    'Nome do Produto',
    'Nº de Ref. Parent SKU. (Opcional)',
    'ID da Variação',
    'Nome da Variação',
    'Nº de Ref. SKU. (Opcional)',
    'Preço Original',
    'Preço de desconto',
  ],
  ['1001', 'Fone Bluetooth TWS', ' fone-bt-tws ', '2001', 'Preto', 'VAR-SECUNDARIO', '89.90', 'R$ 69,90'],
  ['1002', 'Garrafa Térmica Inox 1L', '', '2002', 'Prata', ' garrafa-inox-1l ', '99.90', ' 74.50 '],
  ['1003', 'Produto Sem Desconto Ativo', 'SKU-FORA-BLING', '2003', 'Padrão', '', '49.50', '0,00'],
  ['1004', 'Linha Texto Inválido', 'OUTRO-SKU', '2004', 'Padrão', '', '49.50', '-'],
];
const rawPromoWs = XLSX.utils.aoa_to_sheet(rawPromoRows);
const rawPromoWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(rawPromoWb, rawPromoWs, 'Promoção Bruta');

const parsedPromo = parseShopeePromoWorkbook(rawPromoWb);
assert(parsedPromo.errors.length === 0, `Sem erros esperados na Promoção, recebeu: ${parsedPromo.errors.join('; ')}`);
assert(parsedPromo.result.promoMap.size === 2, `Esperados 2 SKUs ativos em promoção, recebeu ${parsedPromo.result.promoMap.size}`);
assertClose(parsedPromo.result.promoMap.get('FONE-BT-TWS') ?? -1, 69.9, 'Promo Col C prioritária');
assert(!parsedPromo.result.promoMap.has('VAR-SECUNDARIO'), 'Não deve usar variação quando Col C estiver preenchida');
assertClose(parsedPromo.result.promoMap.get('GARRAFA-INOX-1L') ?? -1, 74.5, 'Fallback para Nº de Ref. SKU quando Col C vazia');
assert(!parsedPromo.result.promoMap.has('SKU-FORA-BLING'), 'Preço de desconto 0 não ativa promoção');

// 4. Cruzamento com Base do Bling e Auditoria
const { blingMap } = parseBlingWorkbook(generateBlingSampleWorkbook());
const merged = mergeMarketplaceWithBling({
  channel: 'shopee',
  blingMap,
  shopeeCommonRows: parsedCommon.rows,
  shopeePromoMap: parsedPromo.result.promoMap,
  fallbackWeightKg: 0.5,
});

assert(merged.items.length === 3, 'Total de 3 itens cruzados');
assert(merged.summary.totalEmPromocao === 2, '2 itens em promoção ativa');
assert(merged.summary.totalSemCustoBling === 1, '1 item sem custo no Bling');
assert(merged.items[0].emPromocao && merged.items[0].precoFinalVenda === 69.9, 'Item 1 usa preço de promoção 69.90');
assert(merged.items[1].emPromocao && merged.items[1].precoFinalVenda === 74.5, 'Item 2 usa preço de promoção 74.50');
assert(!merged.items[2].emPromocao && merged.items[2].precoFinalVenda === 49.5, 'Item 3 usa preço normal 49.50');
assert(merged.items[2].statusCruzamento === 'SEM_CUSTO_BLING', 'Item 3 sinaliza SEM_CUSTO_BLING');

const auditedItem1 = auditMergedItem(merged.items[0], defaultSettings, {
  taxPercent: 6,
  targetMarginPercent: 15,
  mlListingType: 'classico',
  mlClassicCommission: 12,
  mlPremiumCommission: 17,
  fallbackWeightKg: 0.5,
  shopeeInCampaign: false,
});
assertClose(auditedItem1.comissaoPercent, 20, 'Shopee <= 79.99 comissão 20%');
assertClose(auditedItem1.freteTaxaValor, 4.5, 'Shopee <= 79.99 taxa fixa 4.50');

// 5. Compatibilidade com os modelos gerados no app
const sampleCommon = parseShopeeCommonWorkbook(generateShopeeCommonSampleWorkbook());
const samplePromo = parseShopeePromoWorkbook(generateShopeePromoSampleWorkbook());
assert(sampleCommon.rows.length === 5, 'Modelo Shopee Preço Comum compatível');
assert(samplePromo.result.promoMap.size === 2, 'Modelo Shopee Promoção compatível');

console.log('Todos os testes de importação bruta e cruzamento da Shopee passaram com sucesso!');

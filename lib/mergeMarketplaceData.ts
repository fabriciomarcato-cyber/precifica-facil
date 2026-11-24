import * as XLSX from 'xlsx';
import { AppSettings, Platform } from '../types';
import {
  calculateMercadoLivrePrice,
  calculateShopeePrice,
  simulateMargin,
} from './calculator';

export type BatchChannel = 'shopee' | 'mercadolivre';
export type MLListingType = 'classico' | 'premium';
export type CruzamentoStatus = 'OK' | 'SEM_CUSTO_BLING';
export type MarginAuditStatus = 'saudavel' | 'alerta' | 'prejuizo';

export interface BlingProductRecord {
  skuNormalizado: string;
  skuOriginal: string;
  descricao: string;
  precoCusto: number;
  estoqueFisico: number;
  pesoBruto: number; // em kg
}

export interface ShopeeCommonRow {
  skuNormalizado: string;
  skuOriginal: string;
  nomeProduto: string;
  precoComum: number;
}

export interface ShopeePromoParseResult {
  promoMap: Map<string, number>;
  totalRows: number;
}

export interface MercadoLivreSheetRow {
  skuNormalizado: string;
  skuOriginal: string;
  titulo: string;
  precoComum: number;
  precoPromocao: number;
  tarifaPlanilhaPercent?: number;
  tipoAnuncio?: MLListingType;
}

export interface MergedMarketplaceItem {
  id: string;
  channel: BatchChannel;
  sku: string;
  skuNormalizado: string;
  titulo: string;
  precoComum: number;
  precoPromocao: number;
  precoFinalVenda: number;
  emPromocao: boolean;
  precoCusto: number;
  estoqueFisico: number;
  pesoBruto: number;
  pesoCalculoUsado: number;
  semPesoBling: boolean;
  statusCruzamento: CruzamentoStatus;
  tarifaPlanilhaPercent?: number;
  tipoAnuncioML?: MLListingType;
}

export interface AuditedBatchItem extends MergedMarketplaceItem {
  tipoAnuncioAplicado?: MLListingType;
  comissaoPercent: number;
  comissaoValor: number;
  freteTaxaValor: number;
  impostoPercent: number;
  impostoValor: number;
  lucroBruto: number;
  margemRealPercent: number;
  precoSugerido: number;
  pontoEquilibrio: number;
  statusMargem: MarginAuditStatus;
}

export interface MergeSummary {
  totalAnuncios: number;
  totalEmPromocao: number;
  totalSemCustoBling: number;
  totalCruzadosOk: number;
}

export interface AuditBatchParams {
  taxPercent: number;
  targetMarginPercent: number;
  mlListingType: MLListingType;
  mlClassicCommission: number;
  mlPremiumCommission: number;
  fallbackWeightKg: number;
  shopeeInCampaign: boolean;
}

/**
 * Normaliza chaves de SKU removendo espaços extras e padronizando em caixa alta.
 */
export function normalizeSkuKey(sku: unknown): string {
  if (sku === null || sku === undefined) return '';
  return String(sku).trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Normaliza cabeçalhos de planilhas removendo BOM, quebras de linha (\r, \n),
 * múltiplos espaços, acentos/diacríticos e convertendo para minúsculas.
 */
export function normalizeHeaderText(header: unknown): string {
  if (header === null || header === undefined) return '';
  return String(header)
    .replace(/\uFEFF/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Normaliza o valor da coluna "Tipo de anúncio" do Mercado Livre
 * removendo espaços extras, acentos e diferenças de caixa.
 */
export function normalizeMLListingType(rawValue: unknown): MLListingType | undefined {
  if (rawValue === null || rawValue === undefined) return undefined;
  const norm = normalizeHeaderText(rawValue);
  if (!norm) return undefined;
  if (norm.includes('premium')) return 'premium';
  if (norm.includes('classico') || norm.includes('classic')) return 'classico';
  return undefined;
}

/**
 * Converte valores monetários e numéricos em formato brasileiro
 * (ex.: "R$ 29,90", "1.250,50", vírgula decimal) ou padrão JS/Excel para number seguro.
 */
export function parseBrazilianNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  let str = String(value).trim();
  if (!str) return 0;

  const isNegative = str.startsWith('-') || /\-\s*R\$/.test(str);
  str = str.replace(/R\$/gi, '').replace(/[^\d.,]/g, '');
  if (!str) return 0;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Formato brasileiro: "1.250,50"
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: "1,250.50"
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Decimal com vírgula: "29,90" ou "0,450"
    str = str.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Múltiplos pontos como separador de milhar: "1.250.000"
      str = str.replace(/\./g, '');
    }
  }

  const num = parseFloat(str);
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * Converte o Peso Bruto do Bling (em kg). Aceita "0,350", "1.25", ou texto explícito com "g" (ex: "350g" -> 0.35kg).
 */
export function parseBlingWeightKg(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  const raw = String(value).trim().toLowerCase();
  if (!raw) return 0;
  const hasExplicitGrams = /\d\s*g\b/.test(raw) && !raw.includes('kg');
  const num = parseBrazilianNumber(raw);
  if (num <= 0) return 0;
  return hasExplicitGrams ? num / 1000 : num;
}

function parsePercentCell(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value > 0 && value <= 1 ? Math.round(value * 10000) / 100 : value;
  }
  const rawStr = String(value).trim();
  const hasPercentSign = rawStr.includes('%');
  const num = parseBrazilianNumber(rawStr.replace('%', ''));
  if (num <= 0) return undefined;
  if (num > 0 && num <= 1 && !hasPercentSign) {
    return Math.round(num * 10000) / 100;
  }
  return num;
}

function extractSheetRows(workbook: XLSX.WorkBook): any[][] {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return Array.isArray(rows) ? rows : [];
}

/**
 * Lê a Planilha Base do Bling utilizando as colunas:
 * - Código (SKU)
 * - Descrição
 * - Preço de custo
 * - Estoque físico
 * - Peso bruto (em kg)
 */
export function parseBlingWorkbook(workbook: XLSX.WorkBook): {
  blingMap: Map<string, BlingProductRecord>;
  totalRows: number;
  errors: string[];
} {
  const blingMap = new Map<string, BlingProductRecord>();
  const errors: string[] = [];
  const rows = extractSheetRows(workbook);

  if (rows.length === 0) {
    return { blingMap, totalRows: 0, errors: ['A planilha base do Bling está vazia.'] };
  }

  let headerRowIndex = -1;
  let bestScore = 0;
  let cols = {
    sku: -1,
    descricao: -1,
    custo: -1,
    estoque: -1,
    peso: -1,
  };

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let skuIdx = -1;
    let descIdx = -1;
    let custoIdx = -1;
    let estoqueIdx = -1;
    let pesoIdx = -1;
    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeaderText(row[c]);
      if (!cell) continue;

      if (
        skuIdx === -1 &&
        (cell === 'codigo (sku)' ||
          cell === 'codigo(sku)' ||
          cell === 'codigo sku' ||
          cell === 'sku' ||
          cell === 'codigo')
      ) {
        skuIdx = c;
        score += cell.includes('codigo') && cell.includes('sku') ? 5 : 3;
      } else if (
        descIdx === -1 &&
        (cell === 'descricao' ||
          cell.includes('descricao') ||
          cell === 'nome' ||
          cell === 'produto')
      ) {
        descIdx = c;
        score += cell === 'descricao' ? 4 : 2;
      } else if (
        custoIdx === -1 &&
        (cell === 'preco de custo' ||
          cell.includes('preco de custo') ||
          cell === 'custo' ||
          cell.includes('custo'))
      ) {
        custoIdx = c;
        score += cell === 'preco de custo' ? 5 : 3;
      } else if (
        estoqueIdx === -1 &&
        (cell === 'estoque fisico' ||
          cell.includes('estoque fisico') ||
          cell === 'estoque' ||
          cell.includes('estoque'))
      ) {
        estoqueIdx = c;
        score += cell === 'estoque fisico' ? 4 : 2;
      } else if (
        pesoIdx === -1 &&
        (cell === 'peso bruto' ||
          cell.includes('peso bruto') ||
          cell === 'peso (kg)' ||
          cell === 'peso')
      ) {
        pesoIdx = c;
        score += cell === 'peso bruto' ? 4 : 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = r;
      cols = {
        sku: skuIdx,
        descricao: descIdx,
        custo: custoIdx,
        estoque: estoqueIdx,
        peso: pesoIdx,
      };
    }
  }

  if (headerRowIndex === -1 || cols.sku === -1) {
    return {
      blingMap,
      totalRows: 0,
      errors: [
        'Cabeçalho do Bling não reconhecido. Verifique se a planilha contém as colunas "Código (SKU)", "Descrição", "Preço de custo", "Estoque físico" e "Peso bruto".',
      ],
    };
  }

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const skuOriginal = String(row[cols.sku] ?? '').trim();
    const skuNormalizado = normalizeSkuKey(skuOriginal);
    if (!skuNormalizado) continue;

    const descricao = cols.descricao !== -1 ? String(row[cols.descricao] ?? '').trim() : '';
    const precoCusto = cols.custo !== -1 ? Math.max(0, parseBrazilianNumber(row[cols.custo])) : 0;
    const estoqueFisico =
      cols.estoque !== -1 ? Math.max(0, Math.round(parseBrazilianNumber(row[cols.estoque]))) : 0;
    const pesoBruto = cols.peso !== -1 ? Math.max(0, parseBlingWeightKg(row[cols.peso])) : 0;

    blingMap.set(skuNormalizado, {
      skuNormalizado,
      skuOriginal,
      descricao,
      precoCusto,
      estoqueFisico,
      pesoBruto,
    });
  }

  if (blingMap.size === 0) {
    errors.push('Nenhum produto com "Código (SKU)" válido foi encontrado na planilha do Bling.');
  }

  return { blingMap, totalRows: blingMap.size, errors };
}

/**
 * Lê o Arquivo de Preço Comum da Shopee:
 * - SKU de referência
 * - Nome do Produto
 * - Preço
 */
export function parseShopeeCommonWorkbook(workbook: XLSX.WorkBook): {
  rows: ShopeeCommonRow[];
  errors: string[];
} {
  const parsed: ShopeeCommonRow[] = [];
  const errors: string[] = [];
  const rawRows = extractSheetRows(workbook);

  if (rawRows.length === 0) {
    return { rows: parsed, errors: ['A planilha de Preço Comum da Shopee está vazia.'] };
  }

  let headerRowIndex = -1;
  let bestScore = 0;
  let cols = { sku: -1, nome: -1, preco: -1 };

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let skuIdx = -1;
    let nomeIdx = -1;
    let precoIdx = -1;
    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeaderText(row[c]);
      if (!cell) continue;

      if (
        skuIdx === -1 &&
        (cell === 'sku de referencia' ||
          cell.includes('sku de referencia') ||
          cell === 'nº de ref. sku' ||
          cell === 'no de ref. sku' ||
          cell === 'sku')
      ) {
        skuIdx = c;
        score += cell.includes('sku de referencia') ? 5 : 3;
      } else if (
        nomeIdx === -1 &&
        (cell === 'nome do produto' ||
          cell.includes('nome do produto') ||
          cell === 'titulo' ||
          cell === 'descricao')
      ) {
        nomeIdx = c;
        score += cell === 'nome do produto' ? 4 : 2;
      } else if (
        precoIdx === -1 &&
        (cell === 'preco' ||
          cell === 'preco (r$)' ||
          cell === 'preco atual' ||
          cell === 'preco de venda' ||
          (cell.includes('preco') && !cell.includes('desconto') && !cell.includes('custo')))
      ) {
        precoIdx = c;
        score += cell === 'preco' ? 5 : 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = r;
      cols = { sku: skuIdx, nome: nomeIdx, preco: precoIdx };
    }
  }

  if (headerRowIndex === -1 || cols.sku === -1 || cols.preco === -1) {
    return {
      rows: parsed,
      errors: [
        'Cabeçalho da Shopee (Preço Comum) não reconhecido. Esperado: "SKU de referência", "Nome do Produto" e "Preço".',
      ],
    };
  }

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const skuOriginal = String(row[cols.sku] ?? '').trim();
    const skuNormalizado = normalizeSkuKey(skuOriginal);
    const nomeProduto = cols.nome !== -1 ? String(row[cols.nome] ?? '').trim() : '';
    const precoComum = Math.max(0, parseBrazilianNumber(row[cols.preco]));

    // Pula linhas auxiliares de template da Shopee (ex.: linha "Obrigatório"/"Opcional" sem preço e sem SKU real)
    const skuHeaderLike = normalizeHeaderText(skuOriginal);
    if (
      !skuNormalizado ||
      skuHeaderLike === 'opcional' ||
      skuHeaderLike === 'obrigatorio' ||
      skuHeaderLike.startsWith('et_title_')
    ) {
      if (precoComum <= 0) continue;
    }

    if (!skuNormalizado && precoComum <= 0) continue;

    parsed.push({
      skuNormalizado,
      skuOriginal: skuOriginal || `SHOPEE-LINHA-${r + 1}`,
      nomeProduto,
      precoComum,
    });
  }

  if (parsed.length === 0) {
    errors.push('Nenhum anúncio válido foi encontrado na planilha de Preço Comum da Shopee.');
  }

  return { rows: parsed, errors };
}

/**
 * Lê o Arquivo de Promoção da Shopee (opcional):
 * - Cruza Nº de Ref. SKU (quando existir) ou Nº de Ref. Parent SKU. (Opcional)
 * - Lê Preço de desconto
 */
export function parseShopeePromoWorkbook(workbook: XLSX.WorkBook): {
  result: ShopeePromoParseResult;
  errors: string[];
} {
  const promoMap = new Map<string, number>();
  const errors: string[] = [];
  const rawRows = extractSheetRows(workbook);

  if (rawRows.length === 0) {
    return {
      result: { promoMap, totalRows: 0 },
      errors: ['A planilha de Promoção da Shopee está vazia.'],
    };
  }

  let headerRowIndex = -1;
  let bestScore = 0;
  let cols = { refSku: -1, parentSku: -1, discountPrice: -1 };

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let refSkuIdx = -1;
    let parentSkuIdx = -1;
    let discountIdx = -1;
    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeaderText(row[c]);
      if (!cell) continue;

      if (
        parentSkuIdx === -1 &&
        (cell.includes('parent sku') ||
          cell.includes('ref. parent sku') ||
          cell.includes('sku parent'))
      ) {
        parentSkuIdx = c;
        score += 4;
      } else if (
        refSkuIdx === -1 &&
        (cell === 'nº de ref. sku' ||
          cell === 'no de ref. sku' ||
          cell.includes('de ref. sku') ||
          cell.includes('de ref sku') ||
          cell === 'sku de referencia' ||
          cell === 'sku')
      ) {
        refSkuIdx = c;
        score += 5;
      } else if (
        discountIdx === -1 &&
        (cell === 'preco de desconto' ||
          cell.includes('preco de desconto') ||
          cell.includes('preco com desconto') ||
          cell.includes('preco promocional') ||
          cell === 'desconto')
      ) {
        discountIdx = c;
        score += 5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = r;
      cols = { refSku: refSkuIdx, parentSku: parentSkuIdx, discountPrice: discountIdx };
    }
  }

  if (
    headerRowIndex === -1 ||
    (cols.refSku === -1 && cols.parentSku === -1) ||
    cols.discountPrice === -1
  ) {
    return {
      result: { promoMap, totalRows: 0 },
      errors: [
        'Cabeçalho da Promoção Shopee não reconhecido. Esperado: "Nº de Ref. SKU" ou "Nº de Ref. Parent SKU. (Opcional)" e "Preço de desconto".',
      ],
    };
  }

  let totalRows = 0;
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const refSku = cols.refSku !== -1 ? normalizeSkuKey(row[cols.refSku]) : '';
    const parentSku = cols.parentSku !== -1 ? normalizeSkuKey(row[cols.parentSku]) : '';
    const discountPrice = Math.max(0, parseBrazilianNumber(row[cols.discountPrice]));

    const key = refSku || parentSku;
    if (!key || discountPrice <= 0) continue;

    promoMap.set(key, discountPrice);
    totalRows++;
  }

  if (totalRows === 0) {
    errors.push('Nenhum SKU com "Preço de desconto" maior que zero foi encontrado na planilha de promoção.');
  }

  return { result: { promoMap, totalRows }, errors };
}

interface MLHeaderCandidate {
  sheetName: string;
  rawRows: any[][];
  headerRowIndex: number;
  cols: {
    sku: number;
    titulo: number;
    preco: number;
    promo: number;
    tarifa: number;
    tipo: number;
  };
  normalizedHeaders: string[];
  score: number;
  requiredCount: number;
}

function matchMLHeaderRow(row: any[]): Omit<MLHeaderCandidate, 'sheetName' | 'rawRows' | 'headerRowIndex'> {
  const normalizedCells = row.map((cell) => normalizeHeaderText(cell));
  const normalizedHeaders = normalizedCells.filter(Boolean);

  let skuIdx = -1;
  let tituloIdx = -1;
  let precoIdx = -1;
  let promoIdx = -1;
  let tarifaIdx = -1;
  let tipoIdx = -1;

  // Passo 1: correspondências exatas / prioritárias (independente da ordem das colunas)
  for (let c = 0; c < normalizedCells.length; c++) {
    const cell = normalizedCells[c];
    if (!cell) continue;

    if (skuIdx === -1 && (cell === 'sku' || cell === 'codigo sku' || cell === 'codigo (sku)' || cell === 'codigo(sku)')) {
      skuIdx = c;
    } else if (tituloIdx === -1 && (cell === 'titulo' || cell === 'titulo do anuncio')) {
      tituloIdx = c;
    } else if (
      promoIdx === -1 &&
      (cell === 'preco em promocao' || cell === 'preco promocional' || cell === 'preco de promocao')
    ) {
      promoIdx = c;
    } else if (
      precoIdx === -1 &&
      (cell === 'preco' || cell === 'preco (r$)' || cell === 'preco atual' || cell === 'preco de venda' || cell === 'valor')
    ) {
      precoIdx = c;
    } else if (
      tipoIdx === -1 &&
      (cell === 'tipo de anuncio' || cell === 'tipo anuncio' || cell === 'exposicao' || cell === 'tipo')
    ) {
      tipoIdx = c;
    } else if (
      tarifaIdx === -1 &&
      (cell === 'tarifa de venda' || cell === 'tarifa' || cell === 'comissao')
    ) {
      tarifaIdx = c;
    }
  }

  // Passo 2: variações parciais / flexíveis para colunas ainda não mapeadas
  for (let c = 0; c < normalizedCells.length; c++) {
    const cell = normalizedCells[c];
    if (!cell) continue;

    if (
      skuIdx === -1 &&
      c !== tituloIdx &&
      c !== precoIdx &&
      c !== promoIdx &&
      c !== tipoIdx &&
      (cell.includes('sku') || cell === 'codigo' || cell === 'cod' || cell === 'referencia')
    ) {
      skuIdx = c;
    } else if (
      tituloIdx === -1 &&
      c !== skuIdx &&
      c !== precoIdx &&
      c !== promoIdx &&
      c !== tipoIdx &&
      (cell.includes('titulo') || cell === 'nome' || cell === 'nome do produto' || cell === 'produto' || (cell.includes('anuncio') && !cell.includes('tipo')))
    ) {
      tituloIdx = c;
    } else if (
      promoIdx === -1 &&
      c !== skuIdx &&
      c !== tituloIdx &&
      c !== precoIdx &&
      c !== tipoIdx &&
      (cell.includes('em promocao') || cell.includes('preco promoc') || cell.includes('promocao') || cell.includes('desconto'))
    ) {
      promoIdx = c;
    } else if (
      precoIdx === -1 &&
      c !== skuIdx &&
      c !== tituloIdx &&
      c !== promoIdx &&
      c !== tipoIdx &&
      ((cell.includes('preco') && !cell.includes('promoc') && !cell.includes('custo')) ||
        (cell.includes('valor') && !cell.includes('custo') && !cell.includes('frete')))
    ) {
      precoIdx = c;
    } else if (
      tipoIdx === -1 &&
      c !== skuIdx &&
      c !== tituloIdx &&
      c !== precoIdx &&
      c !== promoIdx &&
      (cell.includes('tipo de anuncio') || cell.includes('tipo anuncio') || cell.includes('exposicao') || cell.includes('modalidade'))
    ) {
      tipoIdx = c;
    } else if (
      tarifaIdx === -1 &&
      c !== skuIdx &&
      c !== tituloIdx &&
      c !== precoIdx &&
      c !== promoIdx &&
      c !== tipoIdx &&
      (cell.includes('tarifa') || cell.includes('comissao'))
    ) {
      tarifaIdx = c;
    }
  }

  let score = 0;
  if (skuIdx !== -1) score += 5;
  if (precoIdx !== -1) score += 5;
  if (tituloIdx !== -1) score += 3;
  if (promoIdx !== -1) score += 3;
  if (tipoIdx !== -1) score += 3;
  if (tarifaIdx !== -1) score += 1;

  const requiredCount = (skuIdx !== -1 ? 1 : 0) + (precoIdx !== -1 || promoIdx !== -1 ? 1 : 0);

  return {
    cols: {
      sku: skuIdx,
      titulo: tituloIdx,
      preco: precoIdx,
      promo: promoIdx,
      tarifa: tarifaIdx,
      tipo: tipoIdx,
    },
    normalizedHeaders,
    score,
    requiredCount,
  };
}

/**
 * Lê o Arquivo Único do Mercado Livre:
 * - SKU
 * - Título
 * - Preço
 * - Preço em promoção
 * - Tipo de anúncio (Clássico ou Premium)
 */
export function parseMercadoLivreSheetWorkbook(workbook: XLSX.WorkBook): {
  rows: MercadoLivreSheetRow[];
  errors: string[];
} {
  const parsed: MercadoLivreSheetRow[] = [];
  const errors: string[] = [];

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { rows: parsed, errors: ['A planilha do Mercado Livre está vazia.'] };
  }

  let bestCandidate: MLHeaderCandidate | null = null;
  let firstNonEmptyRowHeaders: string[] = [];
  let hasAnyRow = false;

  // Examina todas as abas (planilhas reais do ML às vezes têm aba de instruções antes da aba de anúncios)
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!Array.isArray(rawRows) || rawRows.length === 0) continue;

    let nonEmptyRowsScanned = 0;
    for (let r = 0; r < rawRows.length && nonEmptyRowsScanned < 40; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const hasContent = row.some((cell) => normalizeHeaderText(cell) !== '');
      if (!hasContent) continue; // Ignora linhas iniciais totalmente vazias antes do cabeçalho

      nonEmptyRowsScanned++;
      hasAnyRow = true;

      const match = matchMLHeaderRow(row);
      if (firstNonEmptyRowHeaders.length === 0 && match.normalizedHeaders.length > 0) {
        firstNonEmptyRowHeaders = match.normalizedHeaders;
      }

      if (
        !bestCandidate ||
        match.requiredCount > bestCandidate.requiredCount ||
        (match.requiredCount === bestCandidate.requiredCount && match.score > bestCandidate.score)
      ) {
        bestCandidate = {
          sheetName,
          rawRows,
          headerRowIndex: r,
          cols: match.cols,
          normalizedHeaders: match.normalizedHeaders,
          score: match.score,
          requiredCount: match.requiredCount,
        };
      }
    }
  }

  if (!hasAnyRow || !bestCandidate) {
    return { rows: parsed, errors: ['A planilha do Mercado Livre está vazia.'] };
  }

  const { cols, rawRows, headerRowIndex, normalizedHeaders } = bestCandidate;
  const missingRequired: string[] = [];
  if (cols.sku === -1) missingRequired.push('SKU');
  if (cols.preco === -1 && cols.promo === -1) missingRequired.push('Preço');

  if (missingRequired.length > 0) {
    const foundCols =
      normalizedHeaders.length > 0 ? normalizedHeaders : firstNonEmptyRowHeaders;
    const foundLabel =
      foundCols.length > 0
        ? `Colunas normalizadas encontradas: [${foundCols.map((c) => `"${c}"`).join(', ')}].`
        : 'Nenhuma coluna com texto válido foi identificada na planilha.';

    return {
      rows: parsed,
      errors: [
        `Cabeçalho do Mercado Livre incompleto (faltando: ${missingRequired.join(', ')}). ${foundLabel}`,
      ],
    };
  }

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const skuOriginal = String(row[cols.sku] ?? '').trim();
    const skuNormalizado = normalizeSkuKey(skuOriginal);
    const titulo = cols.titulo !== -1 ? String(row[cols.titulo] ?? '').trim() : '';
    const precoComum = cols.preco !== -1 ? Math.max(0, parseBrazilianNumber(row[cols.preco])) : 0;
    const precoPromocao = cols.promo !== -1 ? Math.max(0, parseBrazilianNumber(row[cols.promo])) : 0;

    if (!skuNormalizado && precoComum <= 0 && precoPromocao <= 0) continue;

    const tarifaPlanilhaPercent =
      cols.tarifa !== -1 ? parsePercentCell(row[cols.tarifa]) : undefined;

    const tipoAnuncio =
      cols.tipo !== -1 ? normalizeMLListingType(row[cols.tipo]) : undefined;

    parsed.push({
      skuNormalizado,
      skuOriginal: skuOriginal || `ML-LINHA-${r + 1}`,
      titulo,
      precoComum,
      precoPromocao,
      tarifaPlanilhaPercent,
      tipoAnuncio,
    });
  }

  if (parsed.length === 0) {
    errors.push('Nenhum anúncio válido foi encontrado na planilha do Mercado Livre.');
  }

  return { rows: parsed, errors };
}

/**
 * Executa o cruzamento (merge) entre a Planilha Base do Bling e os arquivos do marketplace selecionado.
 */
export function mergeMarketplaceWithBling(params: {
  channel: BatchChannel;
  blingMap: Map<string, BlingProductRecord> | null;
  shopeeCommonRows?: ShopeeCommonRow[];
  shopeePromoMap?: Map<string, number> | null;
  mlRows?: MercadoLivreSheetRow[];
  fallbackWeightKg: number;
}): { items: MergedMarketplaceItem[]; summary: MergeSummary } {
  const {
    channel,
    blingMap,
    shopeeCommonRows = [],
    shopeePromoMap = null,
    mlRows = [],
    fallbackWeightKg,
  } = params;

  const items: MergedMarketplaceItem[] = [];

  if (channel === 'shopee') {
    shopeeCommonRows.forEach((row, index) => {
      const bling = row.skuNormalizado && blingMap ? blingMap.get(row.skuNormalizado) : undefined;
      const statusCruzamento: CruzamentoStatus = bling ? 'OK' : 'SEM_CUSTO_BLING';

      const promoPrice =
        row.skuNormalizado && shopeePromoMap ? shopeePromoMap.get(row.skuNormalizado) ?? 0 : 0;
      const emPromocao = promoPrice > 0;
      const precoFinalVenda = emPromocao ? promoPrice : row.precoComum;

      const pesoBruto = bling ? bling.pesoBruto : 0;
      const semPesoBling = pesoBruto < 0.001;
      const pesoCalculoUsado = semPesoBling ? fallbackWeightKg : pesoBruto;

      items.push({
        id: `shopee-${index}-${row.skuNormalizado || 'SEM-SKU'}`,
        channel: 'shopee',
        sku: row.skuOriginal,
        skuNormalizado: row.skuNormalizado,
        titulo: row.nomeProduto || bling?.descricao || `Produto ${row.skuOriginal}`,
        precoComum: row.precoComum,
        precoPromocao: promoPrice,
        precoFinalVenda,
        emPromocao,
        precoCusto: bling ? bling.precoCusto : 0,
        estoqueFisico: bling ? bling.estoqueFisico : 0,
        pesoBruto,
        pesoCalculoUsado,
        semPesoBling,
        statusCruzamento,
      });
    });
  } else {
    mlRows.forEach((row, index) => {
      const bling = row.skuNormalizado && blingMap ? blingMap.get(row.skuNormalizado) : undefined;
      const statusCruzamento: CruzamentoStatus = bling ? 'OK' : 'SEM_CUSTO_BLING';

      const emPromocao = row.precoPromocao > 0;
      const precoFinalVenda = emPromocao ? row.precoPromocao : row.precoComum;

      const pesoBruto = bling ? bling.pesoBruto : 0;
      const semPesoBling = pesoBruto < 0.001;
      const pesoCalculoUsado = semPesoBling ? fallbackWeightKg : pesoBruto;

      items.push({
        id: `ml-${index}-${row.skuNormalizado || 'SEM-SKU'}`,
        channel: 'mercadolivre',
        sku: row.skuOriginal,
        skuNormalizado: row.skuNormalizado,
        titulo: row.titulo || bling?.descricao || `Anúncio ${row.skuOriginal}`,
        precoComum: row.precoComum,
        precoPromocao: row.precoPromocao,
        precoFinalVenda,
        emPromocao,
        precoCusto: bling ? bling.precoCusto : 0,
        estoqueFisico: bling ? bling.estoqueFisico : 0,
        pesoBruto,
        pesoCalculoUsado,
        semPesoBling,
        statusCruzamento,
        tarifaPlanilhaPercent: row.tarifaPlanilhaPercent,
        tipoAnuncioML: row.tipoAnuncio,
      });
    });
  }

  const totalEmPromocao = items.filter((i) => i.emPromocao).length;
  const totalSemCustoBling = items.filter((i) => i.statusCruzamento === 'SEM_CUSTO_BLING').length;
  const totalCruzadosOk = items.length - totalSemCustoBling;

  return {
    items,
    summary: {
      totalAnuncios: items.length,
      totalEmPromocao,
      totalSemCustoBling,
      totalCruzadosOk,
    },
  };
}

function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
}

/**
 * Conecta os dados consolidados (precoFinalVenda, Preço de custo e Peso bruto)
 * ao motor oficial de cálculo de comissões, impostos, frete e margens do Precifica Fácil.
 */
export function auditMergedItem(
  item: MergedMarketplaceItem,
  baseSettings: AppSettings,
  params: AuditBatchParams
): AuditedBatchItem {
  const effectiveSettings: AppSettings = {
    ...baseSettings,
    simplesNacional: params.taxPercent,
    mercadoLivre: {
      ...baseSettings.mercadoLivre,
      contributionMargin: params.targetMarginPercent,
      classicCommission: params.mlClassicCommission,
      premiumCommission: params.mlPremiumCommission,
    },
    shopee: {
      ...baseSettings.shopee,
      contributionMargin: params.targetMarginPercent,
      inCampaign: params.shopeeInCampaign,
    },
  };

  const zeroMarginSettings: AppSettings = {
    ...effectiveSettings,
    mercadoLivre: { ...effectiveSettings.mercadoLivre, contributionMargin: 0 },
    shopee: { ...effectiveSettings.shopee, contributionMargin: 0 },
  };

  const cost = Math.max(0, item.precoCusto);
  const price = Math.max(0, item.precoFinalVenda);
  const weightForCalc =
    item.pesoCalculoUsado >= 0.001
      ? item.pesoCalculoUsado
      : params.fallbackWeightKg >= 0.001
      ? params.fallbackWeightKg
      : 0.5;

  if (item.channel === 'shopee') {
    const sim = simulateMargin(cost, price, weightForCalc, effectiveSettings).find(
      (r) => r.platform === Platform.SHOPEE
    );

    const idealResult = cost > 0 ? calculateShopeePrice(cost, effectiveSettings) : null;
    const floorResult = cost > 0 ? calculateShopeePrice(cost, zeroMarginSettings) : null;

    const comissaoPercent = sim?.commissionPercent ?? 0;
    const comissaoValor = sim?.commission ?? 0;
    const freteTaxaValor = sim?.fixedFee ?? 0;
    const impostoValor = sim?.tax ?? 0;
    const lucroBruto = sim?.grossProfit ?? 0;
    const margemRealPercent = sim?.calculatedMargin ?? 0;

    const precoSugerido =
      idealResult && Number.isFinite(idealResult.finalPrice) ? round2(idealResult.finalPrice) : 0;
    const pontoEquilibrio =
      floorResult && Number.isFinite(floorResult.finalPrice) ? round2(floorResult.finalPrice) : 0;

    let statusMargem: MarginAuditStatus = 'saudavel';
    if (price <= 0 || lucroBruto <= 0 || margemRealPercent <= 0) {
      statusMargem = 'prejuizo';
    } else if (margemRealPercent < params.targetMarginPercent - 0.05) {
      statusMargem = 'alerta';
    }

    return {
      ...item,
      comissaoPercent: round2(comissaoPercent),
      comissaoValor: round2(comissaoValor),
      freteTaxaValor: round2(freteTaxaValor),
      impostoPercent: round2(params.taxPercent),
      impostoValor: round2(impostoValor),
      lucroBruto: round2(lucroBruto),
      margemRealPercent: round2(margemRealPercent),
      precoSugerido,
      pontoEquilibrio,
      statusMargem,
    };
  }

  // Mercado Livre: determina comissão (tarifa da planilha se presente, senão Clássico ou Premium)
  const activeType = item.tipoAnuncioML ?? params.mlListingType;
  const chosenCommission =
    item.tarifaPlanilhaPercent && item.tarifaPlanilhaPercent > 0
      ? item.tarifaPlanilhaPercent
      : activeType === 'premium'
      ? params.mlPremiumCommission
      : params.mlClassicCommission;

  const mlSettings: AppSettings = {
    ...effectiveSettings,
    mercadoLivre: {
      ...effectiveSettings.mercadoLivre,
      classicCommission: chosenCommission,
      premiumCommission: chosenCommission,
    },
  };
  const mlZeroSettings: AppSettings = {
    ...mlSettings,
    mercadoLivre: { ...mlSettings.mercadoLivre, contributionMargin: 0 },
  };

  const sim = simulateMargin(cost, price, weightForCalc, mlSettings).find(
    (r) => r.platform === Platform.ML_CLASSICO
  );

  const commDecimal = chosenCommission / 100;
  const idealResult =
    cost > 0 ? calculateMercadoLivrePrice(cost, commDecimal, weightForCalc, mlSettings) : null;
  const floorResult =
    cost > 0 ? calculateMercadoLivrePrice(cost, commDecimal, weightForCalc, mlZeroSettings) : null;

  const comissaoValor = sim?.commission ?? 0;
  const freteTaxaValor = sim?.fixedFee ?? 0;
  const impostoValor = sim?.tax ?? 0;
  const lucroBruto = sim?.grossProfit ?? 0;
  const margemRealPercent = sim?.calculatedMargin ?? 0;

  const precoSugerido =
    idealResult && Number.isFinite(idealResult.finalPrice) ? round2(idealResult.finalPrice) : 0;
  const pontoEquilibrio =
    floorResult && Number.isFinite(floorResult.finalPrice) ? round2(floorResult.finalPrice) : 0;

  let statusMargem: MarginAuditStatus = 'saudavel';
  if (price <= 0 || lucroBruto <= 0 || margemRealPercent <= 0) {
    statusMargem = 'prejuizo';
  } else if (margemRealPercent < params.targetMarginPercent - 0.05) {
    statusMargem = 'alerta';
  }

  return {
    ...item,
    tipoAnuncioAplicado: activeType,
    comissaoPercent: round2(chosenCommission),
    comissaoValor: round2(comissaoValor),
    freteTaxaValor: round2(freteTaxaValor),
    impostoPercent: round2(params.taxPercent),
    impostoValor: round2(impostoValor),
    lucroBruto: round2(lucroBruto),
    margemRealPercent: round2(margemRealPercent),
    precoSugerido,
    pontoEquilibrio,
    statusMargem,
  };
}

/**
 * Gera planilhas XLSX modelo oficiais para Bling, Shopee (Comum + Promoção) e Mercado Livre
 * para testes imediatos do cruzamento sem PROCV.
 */
export function generateBlingSampleWorkbook(): XLSX.WorkBook {
  const data = [
    {
      'Código (SKU)': 'FONE-BT-TWS',
      'Descrição': 'Fone Bluetooth Sem Fio TWS Cancelamento de Ruído',
      'Preço de custo': 'R$ 32,50',
      'Estoque físico': 42,
      'Peso bruto': '0,250',
    },
    {
      'Código (SKU)': 'GARRAFA-INOX-1L',
      'Descrição': 'Garrafa Térmica Inox 1 Litro Parede Dupla',
      'Preço de custo': 'R$ 39,90',
      'Estoque físico': 18,
      'Peso bruto': '0,650',
    },
    {
      'Código (SKU)': 'MOCHILA-EXEC-01',
      'Descrição': 'Mochila Executiva Impermeável Notebook 15.6',
      'Preço de custo': 'R$ 68,00',
      'Estoque físico': 15,
      'Peso bruto': '1,250',
    },
    {
      'Código (SKU)': 'KIT-CABO-USBC',
      'Descrição': 'Kit 3 Cabos USB-C Turbo Reforçado 1.5m',
      'Preço de custo': 'R$ 11,20',
      'Estoque físico': 120,
      'Peso bruto': '0,180',
    },
    {
      'Código (SKU)': 'LUMINARIA-TOUCH',
      'Descrição': 'Luminária LED Touch Recarregável para Mesa',
      'Preço de custo': 'R$ 24,00',
      'Estoque físico': 30,
      'Peso bruto': '0,420',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Base Bling');
  return wb;
}

export function generateShopeeCommonSampleWorkbook(): XLSX.WorkBook {
  const data = [
    {
      'SKU de referência': 'fone-bt-tws ',
      'Nome do Produto': 'Fone de Ouvido Bluetooth TWS Pro Bateria Longa',
      'Preço': 'R$ 89,90',
    },
    {
      'SKU de referência': 'GARRAFA-INOX-1L',
      'Nome do Produto': 'Garrafa Térmica Inox 1L Mantém Gelado 24h',
      'Preço': 'R$ 99,90',
    },
    {
      'SKU de referência': 'KIT-CABO-USBC',
      'Nome do Produto': 'Kit 3 Cabos Carregador Tipo C Turbo',
      'Preço': 'R$ 29,90',
    },
    {
      'SKU de referência': 'LUMINARIA-TOUCH',
      'Nome do Produto': 'Luminária de Mesa LED Sem Fio Touch',
      'Preço': 'R$ 54,90',
    },
    {
      'SKU de referência': 'SKU-NAO-CADASTRADO',
      'Nome do Produto': 'Suporte Veicular Magnético Universal',
      'Preço': 'R$ 34,90',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shopee Preço Comum');
  return wb;
}

export function generateShopeePromoSampleWorkbook(): XLSX.WorkBook {
  const data = [
    {
      'Nº de Ref. Parent SKU. (Opcional)': 'FONE-BT-TWS',
      'Nº de Ref. SKU': 'FONE-BT-TWS',
      'Preço de desconto': 'R$ 69,90',
    },
    {
      'Nº de Ref. Parent SKU. (Opcional)': 'KIT-CABO-USBC',
      'Nº de Ref. SKU': '',
      'Preço de desconto': 'R$ 22,50',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shopee Promoção');
  return wb;
}

export function generateMLSampleWorkbook(): XLSX.WorkBook {
  const data = [
    {
      'SKU': 'FONE-BT-TWS',
      'Título': 'Fone Bluetooth Sem Fio TWS Alta Definição',
      'Preço': 'R$ 99,90',
      'Preço em promoção': 'R$ 84,90',
      'Tipo de anúncio': 'Clássico',
    },
    {
      'SKU': 'GARRAFA-INOX-1L',
      'Título': 'Garrafa Térmica Inox 1 Litro Academia',
      'Preço': 'R$ 109,90',
      'Preço em promoção': '',
      'Tipo de anúncio': 'Premium',
    },
    {
      'SKU': 'MOCHILA-EXEC-01',
      'Título': 'Mochila Executiva Impermeável Para Notebook',
      'Preço': 'R$ 139,90',
      'Preço em promoção': 'R$ 112,00',
      'Tipo de anúncio': 'Premium',
    },
    {
      'SKU': 'LUMINARIA-TOUCH',
      'Título': 'Luminária LED Touch Mesa Escritório',
      'Preço': 'R$ 49,90',
      'Preço em promoção': '',
      'Tipo de anúncio': 'Clássico',
    },
    {
      'SKU': 'ML-SEM-BLING-99',
      'Título': 'Adaptador HDMI 4K USB-C Hub',
      'Preço': 'R$ 59,90',
      'Preço em promoção': '',
      'Tipo de anúncio': '',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mercado Livre');
  return wb;
}

import {
  getMercadoLivreShippingFee,
  calculateIndividualPrices,
  calculateMaxCost,
  simulateMargin,
} from '../lib/calculator.ts';
import { auditMergedItem } from '../lib/mergeMarketplaceData.ts';
import { auditAutoPriceItem } from '../lib/autoPriceConference.ts';
import { calculateMLItem } from '../lib/mlBatchCalculator.ts';
import { AppSettings, Platform } from '../types.ts';

function assertEqual(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 1e-6) {
    throw new Error(`FALHA [${label}]: esperado ${expected}, recebido ${actual}`);
  }
}

const baseSettings: AppSettings = {
  simplesNacional: 6,
  mercadoLivre: {
    contributionMargin: 15,
    classicCommission: 12,
    premiumCommission: 17,
    productWeight: 1,
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
    productWeight: 1,
  },
};

// 1. Testes diretos da tabela de frete por faixa de peso (preço <= R$ 18,99 -> coluna 0)
const lowPriceCases: Array<[number | string, number, string]> = [
  [0.001, 5.65, '0.001 kg -> Até 0,3 kg'],
  [0.299, 5.65, '0.299 kg -> Até 0,3 kg'],
  [0.3, 5.95, '0.3 kg exato -> 0,3 a 0,5 kg'],
  [0.1 + 0.2, 5.95, '0.1 + 0.2 float -> 0,3 a 0,5 kg'],
  [0.499, 5.95, '0.499 kg -> 0,3 a 0,5 kg'],
  [0.5, 6.05, '0.5 kg exato -> 0,5 a 1 kg'],
  [0.999, 6.05, '0.999 kg -> 0,5 a 1 kg'],
  [1.0, 6.15, '1.0 kg exato -> 1 a 1,5 kg'],
  [1.499, 6.15, '1.499 kg -> 1 a 1,5 kg'],
  [1.5, 6.25, '1.5 kg exato -> 1,5 a 2 kg'],
  [1.999, 6.25, '1.999 kg -> 1,5 a 2 kg'],
  [2.0, 6.35, '2.0 kg exato -> 2 a 3 kg'],
  [2.999, 6.35, '2.999 kg -> 2 a 3 kg'],
  [3.0, 6.45, '3.0 kg exato -> 3 a 4 kg'],
  [3.99, 6.45, '3.99 kg -> 3 a 4 kg'],
  [4.0, 6.55, '4.0 kg exato -> 4 a 5 kg'],
  ['4,00', 6.55, '"4,00" string -> 4 a 5 kg'],
  ['4000g', 6.55, '"4000g" string -> 4 a 5 kg'],
  [4.01, 6.55, '4.01 kg -> 4 a 5 kg'],
  [4.999, 6.55, '4.999 kg -> 4 a 5 kg'],
  [5.0, 6.65, '5.0 kg exato -> 5 a 6 kg'],
  [149.999, 8.65, '149.999 kg -> 125 a 150 kg'],
  [150.0, 8.75, '150.0 kg exato -> Mais de 150 kg'],
  [150.01, 8.75, '150.01 kg -> Mais de 150 kg'],
];

for (const [weight, expected, label] of lowPriceCases) {
  assertEqual(getMercadoLivreShippingFee(15, weight), expected, label);
}

// 2. Testes com faixa de preço >= R$ 79 (R$ 90 -> coluna 3: 3-4kg=17.85, 4-5kg=19.75)
assertEqual(getMercadoLivreShippingFee(90, 3.99), 17.85, 'R$90 | 3.99 kg');
assertEqual(getMercadoLivreShippingFee(90, 4.0), 19.75, 'R$90 | 4.0 kg exato');
assertEqual(getMercadoLivreShippingFee(90, 4.01), 19.75, 'R$90 | 4.01 kg');

// 3. Calculadora unitária (preço sugerido, custo máximo, simulação de margem)
const sim399 = simulateMargin(5, 15, 3.99, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
const sim400 = simulateMargin(5, 15, 4.0, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
const sim401 = simulateMargin(5, 15, 4.01, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
assertEqual(sim399.fixedFee, 6.45, 'simulateMargin 3.99 kg');
assertEqual(sim400.fixedFee, 6.55, 'simulateMargin 4.0 kg');
assertEqual(sim401.fixedFee, 6.55, 'simulateMargin 4.01 kg');

const maxCost399 = calculateMaxCost(15, 3.99, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
const maxCost400 = calculateMaxCost(15, 4.0, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
assertEqual(maxCost399.fixedFee, 6.45, 'calculateMaxCost 3.99 kg');
assertEqual(maxCost400.fixedFee, 6.55, 'calculateMaxCost 4.0 kg');

const calc399Low = calculateIndividualPrices(30, 3.99, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
const calc400Low = calculateIndividualPrices(30, 4.0, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
assertEqual(calc399Low.fixedFee, 9.75, 'calculateIndividualPrices custo 30 | 3.99 kg');
assertEqual(calc400Low.fixedFee, 10.25, 'calculateIndividualPrices custo 30 | 4.0 kg');

const calc399High = calculateIndividualPrices(46, 3.99, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
const calc400High = calculateIndividualPrices(46, 4.0, baseSettings).find(r => r.platform === Platform.ML_CLASSICO)!;
assertEqual(calc399High.fixedFee, 17.85, 'calculateIndividualPrices custo 46 | 3.99 kg');
assertEqual(calc400High.fixedFee, 19.75, 'calculateIndividualPrices custo 46 | 4.0 kg');

// 4. Conferência em Lote (auditMergedItem)
const makeMerged = (peso: number) => ({
  id: `ml-SKU-${peso}`,
  channel: 'mercadolivre' as const,
  sku: `SKU-${peso}`,
  skuNormalizado: `SKU-${peso}`,
  titulo: 'Produto Teste',
  precoComum: 15,
  precoPromocao: 0,
  precoFinalVenda: 15,
  emPromocao: false,
  precoCusto: 5,
  estoqueFisico: 10,
  pesoBruto: peso,
  pesoCalculoUsado: peso,
  semPesoBling: false,
  statusCruzamento: 'OK' as const,
  tipoAnuncioML: 'classico' as const,
});

const batchParams = {
  taxPercent: 6,
  targetMarginPercent: 15,
  fallbackWeightKg: 1,
  shopeeInCampaign: false,
  mlListingType: 'classico' as const,
  mlClassicCommission: 12,
  mlPremiumCommission: 17,
};

assertEqual(auditMergedItem(makeMerged(3.99), baseSettings, batchParams).freteTaxaValor, 6.45, 'Batch audit 3.99 kg');
assertEqual(auditMergedItem(makeMerged(4.0), baseSettings, batchParams).freteTaxaValor, 6.55, 'Batch audit 4.0 kg');
assertEqual(auditMergedItem(makeMerged(4.01), baseSettings, batchParams).freteTaxaValor, 6.55, 'Batch audit 4.01 kg');

// 5. Conferência Automática & ML Batch Calculator legado
assertEqual(
  auditAutoPriceItem(
    {
      id: '1',
      channel: 'ml_classico',
      sku: 'S1',
      marketplaceId: 'MLB1',
      title: 'Teste',
      currentPrice: 15,
      cost: 5,
      weightKg: 4.0,
    },
    baseSettings
  ).currentFixedFee,
  6.55,
  'AutoPriceConference 4.0 kg'
);
assertEqual(
  calculateMLItem(
    {
      id: '1',
      sku: 'S1',
      titulo: 'Teste',
      estoque: 1,
      precoAtual: 15,
      tarifaVendaPercent: 12,
      pesoKg: 4.0,
      custo: 5,
    },
    { taxPercent: 6, targetMarginPercent: 15, defaultCommission: 12 }
  ).freteTaxaValor,
  6.55,
  'MLBatchCalculator 4.0 kg'
);

console.log(`Todos os ${lowPriceCases.length + 15} testes de faixa de peso do Mercado Livre passaram com sucesso!`);

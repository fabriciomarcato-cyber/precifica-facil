
import { AppSettings, Platform, CalculationResult, ShopeeSettings } from '../types';

const MERCADO_LIVRE_SHIPPING_THRESHOLD = 79;

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || !isFinite(value)) {
    return '---';
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercentage(value: number | undefined | null): string {
    if (value === undefined || value === null || !isFinite(value)) {
      return '---';
    }
    return `${value.toFixed(2)}%`;
}

/**
 * Converte entradas de texto ou número em float válido, suportando vírgulas brasileiras (ex: "78,90" ou "0,900").
 */
export function parseNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const cleaned = value.toString().trim().replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Trata o peso informado, aceitando kg (ex: 0.9 ou 0,900) e convertendo inteligentemente se digitado em gramas (ex: 900 -> 0.9kg).
 */
export function parseWeight(value: string | number | undefined | null): number {
  const num = parseNumber(value);
  if (num <= 0) return 1; // Padrão seguro de 1kg
  // Se o usuário digitou em gramas (ex: 900g, 500g, 300g ao invés de kg):
  if (num >= 100 && num <= 150000) {
    return num / 1000;
  }
  return num;
}

// Tabela oficial de custos de envio do Mercado Livre (Vigente a partir de 24 de agosto de 2026)
// Válida para Envios Full, Coleta e Agências em todas as regiões do Brasil.
// As colunas de custos correspondem aos índices de priceTiers:
// [0]: R$ 0 a R$ 18,99 | [1]: R$ 19 a R$ 48,99 | [2]: R$ 49 a R$ 78,99 | [3]: R$ 79 a R$ 99,99
// [4]: R$ 100 a R$ 119,99 | [5]: R$ 120 a R$ 149,99 | [6]: R$ 150 a R$ 199,99 | [7]: A partir de R$ 200
const mlShippingTiers = [
  { maxWeight: 0.3, costs: [5.65, 6.85, 8.15, 12.95, 14.95, 16.95, 19.05, 21.65] }, // Até 0,3 kg (atualizado)
  { maxWeight: 0.5, costs: [5.95, 6.95, 8.25, 13.85, 16.15, 18.15, 20.45, 23.25] }, // De 0,3 a 0,5 kg (atualizado)
  { maxWeight: 1,   costs: [6.05, 7.15, 8.45, 14.45, 16.85, 19.05, 21.35, 24.45] }, // De 0,5 a 1 kg (atualizado)
  { maxWeight: 1.5, costs: [6.15, 7.35, 8.65, 14.75, 17.15, 19.45, 21.75, 25.45] }, // De 1 a 1,5 kg (atualizado)
  { maxWeight: 2,   costs: [6.25, 7.45, 8.75, 15.05, 17.65, 19.85, 22.25, 25.55] }, // De 1,5 a 2 kg (atualizado)
  { maxWeight: 3,   costs: [6.35, 8.65, 9.15, 16.45, 19.15, 21.65, 24.35, 27.05] }, // De 2 a 3 kg (atualizado)
  { maxWeight: 4,   costs: [6.45, 8.75, 9.75, 17.85, 20.75, 23.35, 26.35, 29.25] }, // De 3 a 4 kg (atualizado)
  { maxWeight: 5,   costs: [6.55, 8.85, 10.25, 19.75, 22.85, 26.05, 29.25, 32.45] }, // De 4 a 5 kg (atualizado)
  { maxWeight: 6,   costs: [6.65, 8.95, 10.35, 25.95, 29.15, 33.35, 36.45, 40.85] }, // De 5 a 6 kg (atualizado)
  { maxWeight: 7,   costs: [6.75, 9.05, 10.45, 27.55, 31.65, 36.75, 40.85, 45.25] }, // De 6 a 7 kg (atualizado)
  { maxWeight: 8,   costs: [6.85, 9.25, 10.55, 29.45, 34.35, 39.25, 44.15, 49.35] }, // De 7 a 8 kg (atualizado)
  { maxWeight: 9,   costs: [6.95, 9.35, 10.65, 30.25, 35.25, 40.35, 45.35, 50.75] }, // De 8 a 9 kg (atualizado)
  { maxWeight: 10,  costs: [7.05, 9.45, 10.85, 38.25, 45.05, 51.95, 58.75, 65.85] }, // De 9 a 10 kg (nova faixa adicionada da tabela oficial)
  { maxWeight: 11,  costs: [7.05, 9.65, 11.05, 41.65, 48.55, 55.45, 62.35, 69.35] }, // De 10 a 11 kg (atualizado)
  { maxWeight: 13,  costs: [7.15, 10.05, 11.45, 42.55, 49.75, 56.85, 63.85, 70.95] }, // De 11 a 13 kg (atualizado)
  { maxWeight: 15,  costs: [7.25, 10.25, 11.65, 45.55, 52.95, 60.55, 68.15, 75.65] }, // De 13 a 15 kg (atualizado)
  { maxWeight: 17,  costs: [7.35, 10.45, 11.85, 48.95, 56.55, 64.05, 71.35, 79.35] }, // De 15 a 17 kg (atualizado)
  { maxWeight: 20,  costs: [7.45, 10.65, 12.05, 55.15, 64.35, 73.55, 82.75, 91.95] }, // De 17 a 20 kg (atualizado)
  { maxWeight: 25,  costs: [7.65, 11.05, 12.25, 64.55, 75.75, 85.45, 96.25, 106.85] }, // De 20 a 25 kg (atualizado)
  { maxWeight: 30,  costs: [7.75, 11.25, 12.45, 66.45, 76.05, 86.25, 97.15, 107.85] }, // De 25 a 30 kg (atualizado)
  { maxWeight: 40,  costs: [7.85, 11.45, 12.65, 68.35, 79.65, 89.75, 100.05, 107.95] }, // De 30 a 40 kg (atualizado)
  { maxWeight: 50,  costs: [7.95, 11.65, 12.85, 70.95, 81.85, 92.85, 103.45, 111.65] }, // De 40 a 50 kg (atualizado)
  { maxWeight: 60,  costs: [8.05, 11.85, 13.05, 75.55, 87.25, 99.05, 110.25, 119.05] }, // De 50 a 60 kg (atualizado)
  { maxWeight: 70,  costs: [8.15, 12.05, 13.25, 80.95, 93.75, 105.95, 118.05, 127.45] }, // De 60 a 70 kg (atualizado)
  { maxWeight: 80,  costs: [8.25, 12.25, 13.45, 84.65, 97.95, 110.75, 123.35, 133.15] }, // De 70 a 80 kg (atualizado)
  { maxWeight: 90,  costs: [8.35, 12.45, 13.65, 94.05, 108.35, 122.95, 136.95, 147.85] }, // De 80 a 90 kg (atualizado)
  { maxWeight: 100, costs: [8.45, 12.65, 13.85, 107.45, 124.85, 140.45, 156.45, 168.85] }, // De 90 a 100 kg (atualizado)
  { maxWeight: 125, costs: [8.55, 12.85, 14.05, 120.15, 138.95, 156.95, 174.85, 188.85] }, // De 100 a 125 kg (atualizado)
  { maxWeight: 150, costs: [8.65, 12.85, 14.25, 127.45, 147.05, 166.55, 185.55, 200.35] }, // De 125 a 150 kg (atualizado)
  { maxWeight: Infinity, costs: [8.75, 12.85, 14.45, 167.05, 193.35, 218.45, 243.45, 262.85] }, // Mais de 150 kg (atualizado)
];

// Faixas de preço conforme a tabela oficial do Mercado Livre:
// - R$ 0 a R$ 18,99 (frete grátis padrão / taxa operacional mínima)
// - R$ 19 a R$ 48,99 (frete grátis padrão)
// - R$ 49 a R$ 78,99 (frete grátis padrão)
// - A partir de R$ 79,00 (frete grátis e rápido obrigatório / cortes em 99.99, 119.99, 149.99, 199.99 e 200+)
const priceTiers = [
    { maxPrice: 18.99, index: 0 },
    { maxPrice: 48.99, index: 1 },
    { maxPrice: 78.99, index: 2 },
    { maxPrice: 99.99, index: 3 },
    { maxPrice: 119.99, index: 4 },
    { maxPrice: 149.99, index: 5 },
    { maxPrice: 199.99, index: 6 },
    { maxPrice: Infinity, index: 7 },
];

export function getMercadoLivreShippingFee(price: number | string, weightInKg: number | string): number {
    const numPrice = parseNumber(price);
    const numWeight = parseWeight(weightInKg);

    const priceTier = priceTiers.find(tier => numPrice <= tier.maxPrice);
    const weightTier = mlShippingTiers.find(tier => numWeight <= tier.maxWeight);

    if (priceTier && weightTier) {
        return weightTier.costs[priceTier.index];
    }
    // Fallback for safety
    return mlShippingTiers[mlShippingTiers.length - 1].costs[priceTiers.length - 1];
}


/**
 * Determines the operational cost / shipping fee for Mercado Livre based on the official 2026 shipping cost table.
 */
function getMercadoLivreFees(price: number, weightInKg: number, _settings?: AppSettings) {
    const shippingFee = getMercadoLivreShippingFee(price, weightInKg);
    return { fixedFee: shippingFee, commissionOverridePercent: null };
}

/**
 * Iteratively calculates the final selling price for Mercado Livre, as the fees depend on the final price.
 */
function calculateMercadoLivrePrice(
  productCost: number,
  baseCommissionPercent: number,
  weightInKg: number,
  settings: AppSettings
): { 
    finalPrice: number,
    fixedFee: number,
    commissionValue: number,
    taxValue: number,
    grossProfit: number,
    calculatedMargin: number,
    commissionPercent: number,
} {

    const taxPercent = settings.simplesNacional / 100;
    const marginPercent = settings.mercadoLivre.contributionMargin / 100;

    let sellingPrice = productCost; // Initial guess
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
        const fees = getMercadoLivreFees(sellingPrice, weightInKg, settings);
        const currentCommissionPercent = baseCommissionPercent;
        
        const totalPercentage = marginPercent + currentCommissionPercent + taxPercent;

        if (1 - totalPercentage <= 0) {
            sellingPrice = Infinity;
            break;
        }
        
        const newSellingPrice = (productCost + fees.fixedFee) / (1 - totalPercentage);

        if (!isFinite(sellingPrice) || !isFinite(newSellingPrice) || Math.abs(newSellingPrice - sellingPrice) < 0.01) {
            sellingPrice = newSellingPrice;
            break;
        }

        sellingPrice = newSellingPrice;
        iterations++;
    }

    const finalFees = getMercadoLivreFees(sellingPrice, weightInKg, settings);
    const finalCommissionPercent = baseCommissionPercent;
    
    const commissionValue = sellingPrice * finalCommissionPercent;
    const taxValue = sellingPrice * taxPercent;
    const grossProfit = sellingPrice - productCost - finalFees.fixedFee - commissionValue - taxValue;
    const calculatedMargin = isFinite(sellingPrice) && sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
        finalPrice: sellingPrice,
        fixedFee: finalFees.fixedFee,
        commissionValue,
        taxValue,
        grossProfit,
        calculatedMargin,
        commissionPercent: finalCommissionPercent * 100
    };
}


/**
 * Determines the fee structure for Shopee based on the new 2026 rules.
 */
export function getShopeeFeeComponents(price: number, settings: AppSettings): { commissionPercent: number, fixedFee: number } {
    const { sellerType, highVolumeCPF, inCampaign } = settings.shopee;
    let commissionPercent = 0;
    let fixedFee = 0;

    // Special case for CPF low value (< R$12), which has a total commission formula.
    // Total commission = price * 0.25 + 4.50
    // We represent this as commissionPercent = 0.25 and fixedFee = 4.50 to fit the iterative formula.
    if (sellerType === 'cpf' && price < 12) {
        commissionPercent = 0.25;
        fixedFee = 4.50;
        // The R$3 CPF fee is NOT added here, as this is a specific total commission rule.
        // The campaign fee is added on top.
        if (inCampaign) {
            commissionPercent += 0.025;
        }
        return { commissionPercent, fixedFee };
    }

    // Standard progressive commission for all sellers
    if (price <= 79.99) {
        commissionPercent = 0.20;
        fixedFee = 4.50;
    } else if (price <= 99.99) {
        commissionPercent = 0.14;
        fixedFee = 16.00;
    } else if (price <= 199.99) {
        commissionPercent = 0.14;
        fixedFee = 20.00;
    } else if (price <= 499.99) {
        commissionPercent = 0.14;
        fixedFee = 26.00;
    } else { // >= 500
        commissionPercent = 0.14;
        fixedFee = 26.00;
    }

    // Low value override for CNPJ (< R$8)
    // This rule changes the *fixed fee* part of the commission.
    if (sellerType === 'cnpj' && price < 8) {
        fixedFee = price * 0.50;
    }

    // Additional R$3 fee for high-volume CPF sellers
    if (sellerType === 'cpf' && highVolumeCPF) {
        fixedFee += 3.00;
    }

    // Additional 2.5% for campaign participation
    if (inCampaign) {
        commissionPercent += 0.025;
    }

    return { commissionPercent, fixedFee };
}


/**
 * Iteratively calculates the final selling price for Shopee.
 */
export function calculateShopeePrice(
  productCost: number,
  settings: AppSettings
): { 
    finalPrice: number,
    fixedFee: number,
    commissionValue: number,
    taxValue: number,
    grossProfit: number,
    calculatedMargin: number,
    commissionPercent: number,
} {
    const taxPercent = settings.simplesNacional / 100;
    const marginPercent = settings.shopee.contributionMargin / 100;
    
    let sellingPrice = productCost; // Initial guess
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
        const { commissionPercent, fixedFee } = getShopeeFeeComponents(sellingPrice, settings);
        const totalPercentage = marginPercent + commissionPercent + taxPercent;

        if (1 - totalPercentage <= 0) {
            sellingPrice = Infinity;
            break;
        }
        
        const newSellingPrice = (productCost + fixedFee) / (1 - totalPercentage);

        if (!isFinite(sellingPrice) || !isFinite(newSellingPrice) || Math.abs(newSellingPrice - sellingPrice) < 0.01) {
            sellingPrice = newSellingPrice;
            break;
        }

        sellingPrice = newSellingPrice;
        iterations++;
    }

    const finalFees = getShopeeFeeComponents(sellingPrice, settings);
    const finalCommissionValue = sellingPrice * finalFees.commissionPercent;
    const finalFixedFee = finalFees.fixedFee;

    const taxValue = sellingPrice * taxPercent;
    const grossProfit = sellingPrice - productCost - finalFixedFee - finalCommissionValue - taxValue;
    const calculatedMargin = isFinite(sellingPrice) && sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
    
    return {
        finalPrice: sellingPrice,
        fixedFee: finalFixedFee,
        commissionValue: finalCommissionValue,
        taxValue,
        grossProfit,
        calculatedMargin,
        commissionPercent: finalFees.commissionPercent * 100,
    };
}


/**
 * Retorna a estrutura de taxas do TikTok Shop com base no Preço de Venda e na comissão de afiliado:
 * - Preço < R$ 50,00: Comissão base 10% + Taxa fixa R$ 4,00 por item.
 * - Preço >= R$ 50,00: Comissão base 6% + Taxa fixa R$ 6,00 por item.
 * 
 * A comissão de afiliado (se informada) é somada à comissão base.
 */
export function getTikTokShopFeeComponents(price: number, affiliateCommissionPercent: number = 0) {
  const isUnder50 = price < 50.00;
  const baseCommissionPercent = isUnder50 ? 0.10 : 0.06;
  const fixedFee = isUnder50 ? 4.00 : 6.00;
  const affiliateDecimal = (affiliateCommissionPercent || 0) / 100;
  const totalCommissionPercent = baseCommissionPercent + affiliateDecimal;

  return {
    baseCommissionPercent,
    fixedFee,
    affiliateCommissionPercentDecimal: affiliateDecimal,
    totalCommissionPercent,
  };
}

/**
 * Calcula o Preço de Venda do TikTok Shop testando as faixas de preço (< R$ 50 vs >= R$ 50)
 * e aplicando a comissão de afiliado opcional.
 */
export function calculateTikTokShopPrice(
  productCost: number,
  settings: AppSettings,
  affiliateCommissionPercentOverride?: number
) {
  const taxPercent = settings.simplesNacional / 100;
  const marginPercent = settings.tiktok.contributionMargin / 100;
  const affiliatePercent = (affiliateCommissionPercentOverride !== undefined
    ? affiliateCommissionPercentOverride
    : (settings.tiktok.affiliateCommission || 0));
  const affiliateDecimal = affiliatePercent / 100;

  // Faixa 1: Preço < R$ 50,00 (10% + R$ 4,00)
  const totalRate1 = marginPercent + 0.10 + affiliateDecimal + taxPercent;
  let price1 = Infinity;
  if (1 - totalRate1 > 0) {
    price1 = (productCost + 4.00) / (1 - totalRate1);
  }

  // Faixa 2: Preço >= R$ 50,00 (6% + R$ 6,00)
  const totalRate2 = marginPercent + 0.06 + affiliateDecimal + taxPercent;
  let price2 = Infinity;
  if (1 - totalRate2 > 0) {
    price2 = (productCost + 6.00) / (1 - totalRate2);
  }

  let finalPrice = Infinity;
  let baseCommDecimal = 0.06;
  let fixedFee = 6.00;

  if (price1 < 50.00) {
    finalPrice = price1;
    baseCommDecimal = 0.10;
    fixedFee = 4.00;
  } else if (price2 >= 50.00) {
    finalPrice = price2;
    baseCommDecimal = 0.06;
    fixedFee = 6.00;
  } else {
    // Ponto de transição na borda de R$ 50,00
    finalPrice = price2;
    baseCommDecimal = 0.06;
    fixedFee = 6.00;
  }

  const totalCommDecimal = baseCommDecimal + affiliateDecimal;
  const commissionValue = finalPrice * totalCommDecimal;
  const taxValue = finalPrice * taxPercent;
  const grossProfit = finalPrice - productCost - fixedFee - commissionValue - taxValue;
  const calculatedMargin = isFinite(finalPrice) && finalPrice > 0 ? (grossProfit / finalPrice) * 100 : 0;

  return {
    finalPrice,
    fixedFee,
    commissionValue,
    taxValue,
    grossProfit,
    calculatedMargin,
    commissionPercent: totalCommDecimal * 100,
    baseCommissionPercent: baseCommDecimal * 100,
    affiliateCommissionPercent: affiliatePercent,
  };
}

/**
 * Tabela Oficial de Taxa de Intermediação de Frete da Shein por peso (kg):
 * 0 kg < p <= 0,3 kg   -> R$ 4,00
 * 0,3 kg < p <= 0,6 kg -> R$ 5,00
 * 0,6 kg < p <= 0,9 kg -> R$ 6,00
 * 0,9 kg < p <= 1,2 kg -> R$ 8,00
 * 1,2 kg < p <= 1,5 kg -> R$ 10,00
 * 1,5 kg < p <= 2,0 kg -> R$ 12,00
 * 2,0 kg < p <= 5,0 kg -> R$ 15,00
 * 5,0 kg < p <= 9,0 kg -> R$ 32,00
 * 9,0 kg < p <= 13,0 kg -> R$ 63,00
 * 13,0 kg < p <= 17,0 kg -> R$ 73,00
 * 17,0 kg < p <= 23,0 kg -> R$ 89,00
 * p > 23,0 kg          -> R$ 106,00
 */
export function calcularFreteShein(peso: number | string): number {
  const p = typeof peso === 'string' ? parseWeight(peso) : peso;
  if (!p || p <= 0) return 0;
  if (p <= 0.3) return 4.00;
  if (p <= 0.6) return 5.00;
  if (p <= 0.9) return 6.00;
  if (p <= 1.2) return 8.00;
  if (p <= 1.5) return 10.00;
  if (p <= 2.0) return 12.00;
  if (p <= 5.0) return 15.00;
  if (p <= 9.0) return 32.00;
  if (p <= 13.0) return 63.00;
  if (p <= 17.0) return 73.00;
  if (p <= 23.0) return 89.00;
  return 106.00;
}

export const getSheinShippingFee = calcularFreteShein;

export function getSheinTierLabel(peso: number | string): string {
  const p = typeof peso === 'string' ? parseWeight(peso) : peso;
  if (!p || p <= 0) return 'Informe o peso (kg)';
  if (p <= 0.3) return 'Até 0,3 kg (R$ 4,00)';
  if (p <= 0.6) return '0,3 kg a 0,6 kg (R$ 5,00)';
  if (p <= 0.9) return '0,6 kg a 0,9 kg (R$ 6,00)';
  if (p <= 1.2) return '0,9 kg a 1,2 kg (R$ 8,00)';
  if (p <= 1.5) return '1,2 kg a 1,5 kg (R$ 10,00)';
  if (p <= 2.0) return '1,5 kg a 2,0 kg (R$ 12,00)';
  if (p <= 5.0) return '2,0 kg a 5,0 kg (R$ 15,00)';
  if (p <= 9.0) return '5,0 kg a 9,0 kg (R$ 32,00)';
  if (p <= 13.0) return '9,0 kg a 13,0 kg (R$ 63,00)';
  if (p <= 17.0) return '13,0 kg a 17,0 kg (R$ 73,00)';
  if (p <= 23.0) return '17,0 kg a 23,0 kg (R$ 89,00)';
  return 'Acima de 23,0 kg (R$ 106,00)';
}

/**
 * Cálculo 1: Formação de Preço de Venda da Shein
 * Considera comissão fixa de 18%, impostos (Simples Nacional), margem pretendida
 * e soma a taxa de frete correspondente à faixa de peso.
 * Cálculo 3: Ponto de Equilíbrio / Margem Zero: (Custo + Frete) / (1 - (18% + Imposto))
 */
export function calculateSheinPrice(
  productCost: number,
  weightInKg: number,
  settings: AppSettings
): {
  finalPrice: number;
  fixedFee: number;
  commissionValue: number;
  taxValue: number;
  grossProfit: number;
  calculatedMargin: number;
  commissionPercent: number;
  breakEvenPrice: number;
} {
  const taxRate = (settings.simplesNacional || 0) / 100;
  const marginPercent = settings.shein?.contributionMargin ?? 15;
  const marginRate = marginPercent / 100;
  const commissionPercent = settings.shein?.commission ?? 18;
  const commissionRate = commissionPercent / 100;
  const fixedFee = calcularFreteShein(weightInKg);

  const totalDeductionRate = marginRate + commissionRate + taxRate;
  let finalPrice = 0;
  if (1 - totalDeductionRate > 0) {
    finalPrice = (productCost + fixedFee) / (1 - totalDeductionRate);
  } else {
    finalPrice = Infinity;
  }

  const commissionValue = finalPrice * commissionRate;
  const taxValue = finalPrice * taxRate;
  const grossProfit = finalPrice - productCost - fixedFee - commissionValue - taxValue;
  const calculatedMargin = isFinite(finalPrice) && finalPrice > 0 ? (grossProfit / finalPrice) * 100 : 0;

  // Cálculo 3: Ponto de Equilíbrio (Margem Zero)
  const breakEvenDeduction = commissionRate + taxRate;
  const breakEvenPrice = (1 - breakEvenDeduction > 0) ? (productCost + fixedFee) / (1 - breakEvenDeduction) : 0;

  return {
    finalPrice,
    fixedFee,
    commissionValue,
    taxValue,
    grossProfit,
    calculatedMargin,
    commissionPercent,
    breakEvenPrice,
  };
}

export function calculateIndividualPrices(productCost: number, weightInKg: number, settings: AppSettings): CalculationResult[] {
  if (!settings || !settings.mercadoLivre || !settings.shopee || !settings.tiktok || !settings.instagram) {
    return [];
  }
  const results: CalculationResult[] = [];
  const taxPercent = settings.simplesNacional / 100;

  // Mercado Livre Clássico
  const mlClassicCommissionPercent = settings.mercadoLivre.classicCommission / 100;
  const classicResult = calculateMercadoLivrePrice(productCost, mlClassicCommissionPercent, weightInKg, settings);

  results.push({
    platform: Platform.ML_CLASSICO,
    sellingPrice: classicResult.finalPrice,
    productCost: productCost,
    fixedFee: classicResult.fixedFee,
    commission: classicResult.commissionValue,
    tax: classicResult.taxValue,
    grossProfit: classicResult.grossProfit,
    calculatedMargin: classicResult.calculatedMargin,
    contributionMarginPercent: settings.mercadoLivre.contributionMargin,
    commissionPercent: classicResult.commissionPercent,
    taxPercent: settings.simplesNacional,
  });

  // Mercado Livre Premium
  const mlPremiumCommissionPercent = settings.mercadoLivre.premiumCommission / 100;
  const premiumResult = calculateMercadoLivrePrice(productCost, mlPremiumCommissionPercent, weightInKg, settings);
  
  results.push({
    platform: Platform.ML_PREMIUM,
    sellingPrice: premiumResult.finalPrice,
    productCost: productCost,
    fixedFee: premiumResult.fixedFee,
    commission: premiumResult.commissionValue,
    tax: premiumResult.taxValue,
    grossProfit: premiumResult.grossProfit,
    calculatedMargin: premiumResult.calculatedMargin,
    contributionMarginPercent: settings.mercadoLivre.contributionMargin,
    commissionPercent: premiumResult.commissionPercent,
    taxPercent: settings.simplesNacional,
  });

  // Shopee
  const shopeeResult = calculateShopeePrice(productCost, settings);
  results.push({
    platform: Platform.SHOPEE,
    sellingPrice: shopeeResult.finalPrice,
    productCost: productCost,
    fixedFee: shopeeResult.fixedFee,
    commission: shopeeResult.commissionValue,
    tax: shopeeResult.taxValue,
    grossProfit: shopeeResult.grossProfit,
    calculatedMargin: shopeeResult.calculatedMargin,
    contributionMarginPercent: settings.shopee.contributionMargin,
    commissionPercent: shopeeResult.commissionPercent,
    taxPercent: settings.simplesNacional,
  });

  // TikTok Shop
  const tiktokResult = calculateTikTokShopPrice(productCost, settings);
  results.push({
    platform: Platform.TIKTOK_SHOP,
    sellingPrice: tiktokResult.finalPrice,
    productCost: productCost,
    fixedFee: tiktokResult.fixedFee,
    commission: tiktokResult.commissionValue,
    tax: tiktokResult.taxValue,
    grossProfit: tiktokResult.grossProfit,
    calculatedMargin: tiktokResult.calculatedMargin,
    contributionMarginPercent: settings.tiktok.contributionMargin,
    commissionPercent: tiktokResult.commissionPercent,
    taxPercent: settings.simplesNacional,
  });

  // Instagram
  const instagramMargin = settings.instagram.contributionMargin / 100;
  const instagramFixedFees = settings.instagram.machineFeeFixed + settings.instagram.pixFeeFixed;
  const instagramPercentFees = (settings.instagram.machineFeePercent / 100) + (settings.instagram.pixFeePercent / 100);
  const instagramTotalPercent = instagramMargin + taxPercent + instagramPercentFees;
  const instagramPrice = (productCost + instagramFixedFees) / (1 - instagramTotalPercent);
  const instagramCommissionValue = instagramPrice * instagramPercentFees;
  const instagramTaxValue = instagramPrice * taxPercent;
  const instagramGrossProfit = instagramPrice - productCost - instagramFixedFees - instagramCommissionValue - instagramTaxValue;
  results.push({
    platform: Platform.INSTAGRAM,
    sellingPrice: instagramPrice,
    productCost: productCost,
    fixedFee: instagramFixedFees,
    commission: instagramCommissionValue,
    tax: instagramTaxValue,
    grossProfit: instagramGrossProfit,
    calculatedMargin: (instagramGrossProfit / instagramPrice) * 100,
    contributionMarginPercent: settings.instagram.contributionMargin,
    commissionPercent: instagramPercentFees * 100,
    taxPercent: settings.simplesNacional,
  });

  // Shein
  const sheinResult = calculateSheinPrice(productCost, weightInKg, settings);
  results.push({
    platform: Platform.SHEIN,
    sellingPrice: sheinResult.finalPrice,
    productCost: productCost,
    fixedFee: sheinResult.fixedFee,
    commission: sheinResult.commissionValue,
    tax: sheinResult.taxValue,
    grossProfit: sheinResult.grossProfit,
    calculatedMargin: sheinResult.calculatedMargin,
    contributionMarginPercent: settings.shein?.contributionMargin ?? 15,
    commissionPercent: sheinResult.commissionPercent,
    taxPercent: settings.simplesNacional,
    breakEvenPrice: sheinResult.breakEvenPrice,
    weightUsed: weightInKg,
  });

  return results;
}

export function calculateMaxCost(desiredPrice: number, weightInKg: number, settings: AppSettings): CalculationResult[] {
    if (!settings || !settings.mercadoLivre || !settings.shopee || !settings.tiktok || !settings.instagram) {
      return [];
    }
    const results: CalculationResult[] = [];
    const taxPercent = settings.simplesNacional / 100;

    const platforms = [
        Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM, Platform.SHEIN
    ];

    platforms.forEach(platform => {
        let commissionRate = 0;
        let fixedFee = 0;
        let marginPercent = 0;
        let contributionMargin = 0;
        
        switch (platform) {
            case Platform.ML_CLASSICO:
                commissionRate = settings.mercadoLivre.classicCommission / 100;
                fixedFee = getMercadoLivreFees(desiredPrice, weightInKg, settings).fixedFee;
                marginPercent = settings.mercadoLivre.contributionMargin / 100;
                contributionMargin = settings.mercadoLivre.contributionMargin;
                break;
            case Platform.ML_PREMIUM:
                commissionRate = settings.mercadoLivre.premiumCommission / 100;
                fixedFee = getMercadoLivreFees(desiredPrice, weightInKg, settings).fixedFee;
                marginPercent = settings.mercadoLivre.contributionMargin / 100;
                contributionMargin = settings.mercadoLivre.contributionMargin;
                break;
            case Platform.SHOPEE:
                const shopeeFees = getShopeeFeeComponents(desiredPrice, settings);
                commissionRate = shopeeFees.commissionPercent;
                fixedFee = shopeeFees.fixedFee;
                marginPercent = settings.shopee.contributionMargin / 100;
                contributionMargin = settings.shopee.contributionMargin;
                break;
            case Platform.TIKTOK_SHOP: {
                const tiktokFees = getTikTokShopFeeComponents(desiredPrice, settings.tiktok.affiliateCommission || 0);
                commissionRate = tiktokFees.totalCommissionPercent;
                fixedFee = tiktokFees.fixedFee;
                marginPercent = settings.tiktok.contributionMargin / 100;
                contributionMargin = settings.tiktok.contributionMargin;
                break;
            }
            case Platform.INSTAGRAM:
                commissionRate = (settings.instagram.machineFeePercent / 100) + (settings.instagram.pixFeePercent / 100);
                fixedFee = settings.instagram.machineFeeFixed + settings.instagram.pixFeeFixed;
                marginPercent = settings.instagram.contributionMargin / 100;
                contributionMargin = settings.instagram.contributionMargin;
                break;
            case Platform.SHEIN:
                commissionRate = (settings.shein?.commission ?? 18) / 100;
                fixedFee = calcularFreteShein(weightInKg);
                marginPercent = (settings.shein?.contributionMargin ?? 15) / 100;
                contributionMargin = settings.shein?.contributionMargin ?? 15;
                break;
        }

        const commissionValue = desiredPrice * commissionRate;
        const taxValue = desiredPrice * taxPercent;
        const profitValue = desiredPrice * marginPercent;
        const maxCost = desiredPrice - fixedFee - commissionValue - taxValue - profitValue;

        const breakEvenDeduction = commissionRate + taxPercent;
        const breakEvenPrice = (1 - breakEvenDeduction > 0)
          ? (Math.max(0, maxCost) + fixedFee) / (1 - breakEvenDeduction)
          : undefined;

        results.push({
            platform,
            sellingPrice: desiredPrice,
            maxProductCost: maxCost,
            fixedFee,
            commission: commissionValue,
            tax: taxValue,
            grossProfit: profitValue,
            calculatedMargin: marginPercent * 100,
            contributionMarginPercent: contributionMargin,
            commissionPercent: commissionRate * 100,
            taxPercent: settings.simplesNacional,
            breakEvenPrice,
            weightUsed: weightInKg,
        });
    });

    return results;
}

export function simulateMargin(productCost: number, sellingPrice: number, weightInKg: number, settings: AppSettings): CalculationResult[] {
    if (!settings || !settings.mercadoLivre || !settings.shopee || !settings.tiktok || !settings.instagram) {
      return [];
    }
    const results: CalculationResult[] = [];
    const taxRate = settings.simplesNacional / 100;
    
    const platforms = [
        Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM, Platform.SHEIN
    ];

    platforms.forEach(platform => {
        let commissionRate = 0;
        let fixedFee = 0;

        switch (platform) {
            case Platform.ML_CLASSICO:
                commissionRate = settings.mercadoLivre.classicCommission / 100;
                fixedFee = getMercadoLivreFees(sellingPrice, weightInKg, settings).fixedFee;
                break;
            case Platform.ML_PREMIUM:
                commissionRate = settings.mercadoLivre.premiumCommission / 100;
                fixedFee = getMercadoLivreFees(sellingPrice, weightInKg, settings).fixedFee;
                break;
            case Platform.SHOPEE:
                const shopeeFeesSim = getShopeeFeeComponents(sellingPrice, settings);
                commissionRate = shopeeFeesSim.commissionPercent;
                fixedFee = shopeeFeesSim.fixedFee;
                break;
            case Platform.TIKTOK_SHOP: {
                const tiktokFeesSim = getTikTokShopFeeComponents(sellingPrice, settings.tiktok.affiliateCommission || 0);
                commissionRate = tiktokFeesSim.totalCommissionPercent;
                fixedFee = tiktokFeesSim.fixedFee;
                break;
            }
            case Platform.INSTAGRAM:
                commissionRate = (settings.instagram.machineFeePercent / 100) + (settings.instagram.pixFeePercent / 100);
                fixedFee = settings.instagram.machineFeeFixed + settings.instagram.pixFeeFixed;
                break;
            case Platform.SHEIN:
                commissionRate = (settings.shein?.commission ?? 18) / 100;
                fixedFee = calcularFreteShein(weightInKg);
                break;
        }

        const commissionValue = sellingPrice * commissionRate;
        const taxValue = sellingPrice * taxRate;
        const grossProfit = sellingPrice - productCost - fixedFee - commissionValue - taxValue;
        const calculatedMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

        // Cálculo 3: Ponto de Equilíbrio (Margem Zero)
        const breakEvenDeduction = commissionRate + taxRate;
        const breakEvenPrice = (1 - breakEvenDeduction > 0)
          ? (productCost + fixedFee) / (1 - breakEvenDeduction)
          : undefined;

        results.push({
            platform,
            productCost,
            sellingPrice,
            fixedFee,
            commission: commissionValue,
            tax: taxValue,
            grossProfit,
            calculatedMargin,
            commissionPercent: commissionRate * 100,
            taxPercent: settings.simplesNacional,
            breakEvenPrice,
            weightUsed: weightInKg,
        });
    });

    return results;
}

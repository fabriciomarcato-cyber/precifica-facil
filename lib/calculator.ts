
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

const mlShippingTiers = [
  { maxWeight: 0.3, costs: [5.65, 6.55, 7.75, 12.35, 14.35, 16.45, 18.45, 20.95] },
  { maxWeight: 0.5, costs: [5.95, 6.65, 7.85, 13.25, 15.45, 17.65, 19.85, 22.55] },
  { maxWeight: 1,   costs: [6.05, 6.75, 7.95, 13.85, 16.15, 18.45, 20.75, 23.65] },
  { maxWeight: 1.5, costs: [6.15, 6.85, 8.05, 14.15, 16.45, 18.85, 21.15, 24.65] },
  { maxWeight: 2,   costs: [6.25, 6.95, 8.15, 14.45, 16.85, 19.25, 21.65, 24.65] },
  { maxWeight: 3,   costs: [6.35, 7.95, 8.55, 15.75, 18.35, 21.05, 23.65, 26.25] },
  { maxWeight: 4,   costs: [6.45, 8.15, 8.95, 17.05, 19.85, 22.65, 25.55, 28.35] },
  { maxWeight: 5,   costs: [6.55, 8.35, 9.75, 18.45, 21.55, 24.65, 27.75, 30.75] },
  { maxWeight: 6,   costs: [6.65, 8.55, 9.95, 25.45, 28.55, 32.65, 35.75, 39.75] },
  { maxWeight: 7,   costs: [6.75, 8.75, 10.15, 27.05, 31.05, 36.05, 40.05, 44.05] },
  { maxWeight: 8,   costs: [6.85, 8.95, 10.35, 28.85, 33.65, 38.45, 43.25, 48.05] },
  { maxWeight: 9,   costs: [6.95, 9.15, 10.55, 29.65, 34.55, 39.55, 44.45, 49.35] },
  { maxWeight: 11,  costs: [7.05, 9.55, 10.95, 41.25, 48.05, 54.95, 61.75, 68.65] },
  { maxWeight: 13,  costs: [7.15, 9.95, 11.35, 42.15, 49.25, 56.25, 63.25, 70.25] },
  { maxWeight: 15,  costs: [7.25, 10.15, 11.55, 45.05, 52.45, 59.95, 67.45, 74.95] },
  { maxWeight: 17,  costs: [7.35, 10.35, 11.75, 48.55, 56.05, 63.55, 70.75, 78.65] },
  { maxWeight: 20,  costs: [7.45, 10.55, 11.95, 54.75, 63.85, 72.95, 82.05, 91.15] },
  { maxWeight: 25,  costs: [7.65, 10.95, 12.15, 64.05, 75.05, 84.75, 95.35, 105.95] },
  { maxWeight: 30,  costs: [7.75, 11.15, 12.35, 65.95, 75.45, 85.55, 96.25, 106.95] },
  { maxWeight: 40,  costs: [7.85, 11.35, 12.55, 67.75, 78.95, 88.95, 99.15, 107.05] },
  { maxWeight: 50,  costs: [7.95, 11.55, 12.75, 70.25, 81.05, 92.05, 102.55, 110.75] },
  { maxWeight: 60,  costs: [8.05, 11.75, 12.95, 74.95, 86.45, 98.15, 109.35, 118.15] },
  { maxWeight: 70,  costs: [8.15, 11.95, 13.15, 80.25, 92.95, 105.05, 117.15, 126.55] },
  { maxWeight: 80,  costs: [8.25, 12.15, 13.35, 83.95, 97.05, 109.85, 122.45, 132.25] },
  { maxWeight: 90,  costs: [8.35, 12.35, 13.55, 93.25, 107.45, 122.05, 136.05, 146.95] },
  { maxWeight: 100, costs: [8.45, 12.55, 13.75, 106.55, 123.95, 139.55, 155.55, 167.95] },
  { maxWeight: 125, costs: [8.55, 12.75, 13.95, 119.25, 138.05, 156.05, 173.95, 187.95] },
  { maxWeight: 150, costs: [8.65, 12.75, 14.15, 126.55, 146.15, 165.65, 184.65, 199.45] },
  { maxWeight: Infinity, costs: [8.75, 12.75, 14.35, 166.15, 192.45, 217.55, 242.55, 261.95] },
];

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

function getMercadoLivreShippingFee(price: number, weightInKg: number): number {
    const priceTier = priceTiers.find(tier => price <= tier.maxPrice);
    const weightTier = mlShippingTiers.find(tier => weightInKg <= tier.maxWeight);

    if (priceTier && weightTier) {
        return weightTier.costs[priceTier.index];
    }
    // Fallback for safety
    return mlShippingTiers[mlShippingTiers.length - 1].costs[priceTiers.length - 1];
}


/**
 * Determines the fixed fee for Mercado Livre based on the new 2026 shipping cost table.
 */
function getMercadoLivreFees(price: number, weightInKg: number, settings: AppSettings) {
    if (settings.mercadoLivre.useManualFixedFee) {
        return { fixedFee: settings.mercadoLivre.manualFixedFeeValue, commissionOverridePercent: null };
    }
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
function getShopeeFeeComponents(price: number, settings: AppSettings): { commissionPercent: number, fixedFee: number } {
    const { sellerType, highVolumeCPF, inCampaign } = settings.shopee;
    let commissionPercent = 0;
    let fixedFee = 0;

    // Special case for CPF low value (< R$12), which has a total commission formula.
    // Total commission = price * 0.25 + 4
    // We represent this as commissionPercent = 0.25 and fixedFee = 4 to fit the iterative formula.
    if (sellerType === 'cpf' && price < 12) {
        commissionPercent = 0.25;
        fixedFee = 4.00;
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
        fixedFee = 4.00;
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
function calculateShopeePrice(
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

  return results;
}

export function calculateMaxCost(desiredPrice: number, weightInKg: number, settings: AppSettings): CalculationResult[] {
    if (!settings || !settings.mercadoLivre || !settings.shopee || !settings.tiktok || !settings.instagram) {
      return [];
    }
    const results: CalculationResult[] = [];
    const taxPercent = settings.simplesNacional / 100;

    const platforms = [
        Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM
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
        }

        const commissionValue = desiredPrice * commissionRate;
        const taxValue = desiredPrice * taxPercent;
        const profitValue = desiredPrice * marginPercent;
        const maxCost = desiredPrice - fixedFee - commissionValue - taxValue - profitValue;

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
        Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM
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
        }

        const commissionValue = sellingPrice * commissionRate;
        const taxValue = sellingPrice * taxRate;
        const grossProfit = sellingPrice - productCost - fixedFee - commissionValue - taxValue;
        const calculatedMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

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
        });
    });

    return results;
}

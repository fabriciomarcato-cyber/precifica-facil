
import { AppSettings, Platform, CalculationResult } from '../types';

const MERCADO_LIVRE_SHIPPING_THRESHOLD = 79;
const SHOPEE_LOW_PRICE_THRESHOLD = 10;

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
 * Determines the fixed fee and any commission override for Mercado Livre based on the selling price.
 */
function getMercadoLivreFees(price: number, settings: AppSettings) {
    if (price < 12.50) {
        return { fixedFee: 0, commissionOverridePercent: 0.50 }; // 50% commission
    }
    if (price >= 12.50 && price <= 29.00) {
        return { fixedFee: 6.25, commissionOverridePercent: null };
    }
    if (price > 29.00 && price <= 50.00) {
        return { fixedFee: 6.50, commissionOverridePercent: null };
    }
    if (price > 50.00 && price < MERCADO_LIVRE_SHIPPING_THRESHOLD) {
        return { fixedFee: 6.75, commissionOverridePercent: null };
    }
    // For prices >= 79.00
    return { fixedFee: settings.mercadoLivre.shippingFee, commissionOverridePercent: null };
}

/**
 * Iteratively calculates the final selling price for Mercado Livre, as the fees depend on the final price.
 */
function calculateMercadoLivrePrice(
  productCost: number,
  baseCommissionPercent: number,
  settings: AppSettings
): { 
    finalPrice: number, 
    fixedFee: number, 
    commissionValue: number, 
    taxValue: number, 
    grossProfit: number, 
    calculatedMargin: number, 
    commissionPercent: number 
} {

    const taxPercent = settings.simplesNacional / 100;
    const marginPercent = settings.mercadoLivre.contributionMargin / 100;

    let sellingPrice = productCost; // Initial guess
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
        const fees = getMercadoLivreFees(sellingPrice, settings);
        const currentCommissionPercent = fees.commissionOverridePercent !== null 
            ? fees.commissionOverridePercent 
            : baseCommissionPercent;
        
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

    const finalFees = getMercadoLivreFees(sellingPrice, settings);
    const finalCommissionPercent = finalFees.commissionOverridePercent !== null 
        ? finalFees.commissionOverridePercent 
        : baseCommissionPercent;
    
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
 * Determines the fee structure for Shopee based on the selling price.
 */
function getShopeeFeeLogic(price: number, settings: AppSettings) {
    if (price < SHOPEE_LOW_PRICE_THRESHOLD) {
        // The fixed fee is replaced by a 50% charge on the selling price.
        return { fixedFeeValue: 0, additionalPercentage: 0.50 };
    }
    // For prices >= 10.00, use the configured fixed fee.
    return { fixedFeeValue: settings.shopee.fixedFee, additionalPercentage: 0 };
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
    commissionPercent: number 
} {
    const taxPercent = settings.simplesNacional / 100;
    const marginPercent = settings.shopee.contributionMargin / 100;
    const baseCommissionPercent = settings.shopee.commission / 100;

    let sellingPrice = productCost; // Initial guess
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
        const feeLogic = getShopeeFeeLogic(sellingPrice, settings);
        const totalPercentage = marginPercent + baseCommissionPercent + taxPercent + feeLogic.additionalPercentage;

        if (1 - totalPercentage <= 0) {
            sellingPrice = Infinity;
            break;
        }
        
        const newSellingPrice = (productCost + feeLogic.fixedFeeValue) / (1 - totalPercentage);

        if (!isFinite(sellingPrice) || !isFinite(newSellingPrice) || Math.abs(newSellingPrice - sellingPrice) < 0.01) {
            sellingPrice = newSellingPrice;
            break;
        }

        sellingPrice = newSellingPrice;
        iterations++;
    }

    let finalFixedFee: number;
    if (sellingPrice < SHOPEE_LOW_PRICE_THRESHOLD) {
        finalFixedFee = sellingPrice * 0.50;
    } else {
        // FIX: Corrected typo from `shpee` to `shopee`.
        finalFixedFee = settings.shopee.fixedFee;
    }
    
    const commissionValue = sellingPrice * baseCommissionPercent;
    const taxValue = sellingPrice * taxPercent;
    const grossProfit = sellingPrice - productCost - finalFixedFee - commissionValue - taxValue;
    const calculatedMargin = isFinite(sellingPrice) && sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
    
    return {
        finalPrice: sellingPrice,
        fixedFee: finalFixedFee,
        commissionValue,
        taxValue,
        grossProfit,
        calculatedMargin,
        commissionPercent: settings.shopee.commission
    };
}


export function calculateIndividualPrices(productCost: number, settings: AppSettings): CalculationResult[] {
  const results: CalculationResult[] = [];
  const taxPercent = settings.simplesNacional / 100;

  // Mercado Livre Clássico
  const mlClassicCommissionPercent = settings.mercadoLivre.classicCommission / 100;
  const classicResult = calculateMercadoLivrePrice(productCost, mlClassicCommissionPercent, settings);

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
  const premiumResult = calculateMercadoLivrePrice(productCost, mlPremiumCommissionPercent, settings);
  
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
  const tiktokMargin = settings.tiktok.contributionMargin / 100;
  const tiktokCommission = (settings.tiktok.commission + settings.tiktok.shippingCommission) / 100;
  const tiktokTotalPercent = tiktokMargin + tiktokCommission + taxPercent;
  const tiktokPrice = (productCost + settings.tiktok.fixedFee) / (1 - tiktokTotalPercent);
  const tiktokCommissionValue = tiktokPrice * tiktokCommission;
  const tiktokTaxValue = tiktokPrice * taxPercent;
  const tiktokGrossProfit = tiktokPrice - productCost - settings.tiktok.fixedFee - tiktokCommissionValue - tiktokTaxValue;
  results.push({
    platform: Platform.TIKTOK_SHOP,
    sellingPrice: tiktokPrice,
    productCost: productCost,
    fixedFee: settings.tiktok.fixedFee,
    commission: tiktokCommissionValue,
    tax: tiktokTaxValue,
    grossProfit: tiktokGrossProfit,
    calculatedMargin: (tiktokGrossProfit / tiktokPrice) * 100,
    contributionMarginPercent: settings.tiktok.contributionMargin,
    commissionPercent: settings.tiktok.commission + settings.tiktok.shippingCommission,
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

export function calculateMaxCost(desiredPrice: number, settings: AppSettings): CalculationResult[] {
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
                const baseClassicRate = settings.mercadoLivre.classicCommission / 100;
                const classicFees = getMercadoLivreFees(desiredPrice, settings);
                commissionRate = classicFees.commissionOverridePercent !== null ? classicFees.commissionOverridePercent : baseClassicRate;
                fixedFee = classicFees.fixedFee;
                marginPercent = settings.mercadoLivre.contributionMargin / 100;
                contributionMargin = settings.mercadoLivre.contributionMargin;
                break;
            case Platform.ML_PREMIUM:
                const basePremiumRate = settings.mercadoLivre.premiumCommission / 100;
                const premiumFees = getMercadoLivreFees(desiredPrice, settings);
                commissionRate = premiumFees.commissionOverridePercent !== null ? premiumFees.commissionOverridePercent : basePremiumRate;
                fixedFee = premiumFees.fixedFee;
                marginPercent = settings.mercadoLivre.contributionMargin / 100;
                contributionMargin = settings.mercadoLivre.contributionMargin;
                break;
            case Platform.SHOPEE:
                commissionRate = settings.shopee.commission / 100;
                if (desiredPrice < SHOPEE_LOW_PRICE_THRESHOLD) {
                    fixedFee = desiredPrice * 0.50;
                } else {
                    fixedFee = settings.shopee.fixedFee;
                }
                marginPercent = settings.shopee.contributionMargin / 100;
                contributionMargin = settings.shopee.contributionMargin;
                break;
            case Platform.TIKTOK_SHOP:
                commissionRate = (settings.tiktok.commission + settings.tiktok.shippingCommission) / 100;
                fixedFee = settings.tiktok.fixedFee;
                marginPercent = settings.tiktok.contributionMargin / 100;
                contributionMargin = settings.tiktok.contributionMargin;
                break;
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

export function simulateMargin(productCost: number, sellingPrice: number, settings: AppSettings): CalculationResult[] {
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
                const baseClassicRate = settings.mercadoLivre.classicCommission / 100;
                const classicFees = getMercadoLivreFees(sellingPrice, settings);
                commissionRate = classicFees.commissionOverridePercent !== null ? classicFees.commissionOverridePercent : baseClassicRate;
                fixedFee = classicFees.fixedFee;
                break;
            case Platform.ML_PREMIUM:
                const basePremiumRate = settings.mercadoLivre.premiumCommission / 100;
                const premiumFees = getMercadoLivreFees(sellingPrice, settings);
                commissionRate = premiumFees.commissionOverridePercent !== null ? premiumFees.commissionOverridePercent : basePremiumRate;
                fixedFee = premiumFees.fixedFee;
                break;
            case Platform.SHOPEE:
                commissionRate = settings.shopee.commission / 100;
                if (sellingPrice < SHOPEE_LOW_PRICE_THRESHOLD) {
                    fixedFee = sellingPrice * 0.50;
                } else {
                    fixedFee = settings.shopee.fixedFee;
                }
                break;
            case Platform.TIKTOK_SHOP:
                commissionRate = (settings.tiktok.commission + settings.tiktok.shippingCommission) / 100;
                fixedFee = settings.tiktok.fixedFee;
                break;
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
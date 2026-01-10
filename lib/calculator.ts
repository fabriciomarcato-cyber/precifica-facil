
import { AppSettings, Platform, CalculationResult } from '../types';

const MERCADO_LIVRE_SHIPPING_THRESHOLD = 79;

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '---';
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercentage(value: number | undefined | null): string {
    if (value === undefined || value === null || isNaN(value)) {
      return '---';
    }
    return `${value.toFixed(2)}%`;
}

function calculateSellingPrice(
  productCost: number,
  fixedCost: number,
  totalPercentage: number
): number {
  if (1 - totalPercentage <= 0) return Infinity;
  return (productCost + fixedCost) / (1 - totalPercentage);
}

export function calculateIndividualPrices(productCost: number, settings: AppSettings): CalculationResult[] {
  const results: CalculationResult[] = [];
  const taxPercent = settings.simplesNacional / 100;

  // Mercado Livre Clássico
  const mlClassicMargin = settings.mercadoLivre.contributionMargin / 100;
  const mlClassicCommission = settings.mercadoLivre.classicCommission / 100;
  let mlClassicTotalPercent = mlClassicMargin + mlClassicCommission + taxPercent;
  let tempClassicPrice = calculateSellingPrice(productCost, settings.mercadoLivre.fixedFee, mlClassicTotalPercent);
  
  let mlClassicFinalPrice: number;
  let mlClassicFixedFee: number;

  if (tempClassicPrice >= MERCADO_LIVRE_SHIPPING_THRESHOLD) {
    mlClassicFixedFee = settings.mercadoLivre.shippingFee;
    mlClassicFinalPrice = calculateSellingPrice(productCost, mlClassicFixedFee, mlClassicTotalPercent);
  } else {
    mlClassicFixedFee = settings.mercadoLivre.fixedFee;
    mlClassicFinalPrice = tempClassicPrice;
  }
  
  const mlClassicCommissionValue = mlClassicFinalPrice * mlClassicCommission;
  const mlClassicTaxValue = mlClassicFinalPrice * taxPercent;
  const mlClassicGrossProfit = mlClassicFinalPrice - productCost - mlClassicFixedFee - mlClassicCommissionValue - mlClassicTaxValue;
  
  results.push({
    platform: Platform.ML_CLASSICO,
    sellingPrice: mlClassicFinalPrice,
    productCost: productCost,
    fixedFee: mlClassicFixedFee,
    commission: mlClassicCommissionValue,
    tax: mlClassicTaxValue,
    grossProfit: mlClassicGrossProfit,
    calculatedMargin: (mlClassicGrossProfit / mlClassicFinalPrice) * 100,
    contributionMarginPercent: settings.mercadoLivre.contributionMargin,
    commissionPercent: settings.mercadoLivre.classicCommission,
    taxPercent: settings.simplesNacional,
  });

  // Mercado Livre Premium
  const mlPremiumMargin = settings.mercadoLivre.contributionMargin / 100;
  const mlPremiumCommission = settings.mercadoLivre.premiumCommission / 100;
  let mlPremiumTotalPercent = mlPremiumMargin + mlPremiumCommission + taxPercent;
  let tempPremiumPrice = calculateSellingPrice(productCost, settings.mercadoLivre.fixedFee, mlPremiumTotalPercent);
  
  let mlPremiumFinalPrice: number;
  let mlPremiumFixedFee: number;
  
  if (tempPremiumPrice >= MERCADO_LIVRE_SHIPPING_THRESHOLD) {
      mlPremiumFixedFee = settings.mercadoLivre.shippingFee;
      mlPremiumFinalPrice = calculateSellingPrice(productCost, mlPremiumFixedFee, mlPremiumTotalPercent);
  } else {
      mlPremiumFixedFee = settings.mercadoLivre.fixedFee;
      mlPremiumFinalPrice = tempPremiumPrice;
  }

  const mlPremiumCommissionValue = mlPremiumFinalPrice * mlPremiumCommission;
  const mlPremiumTaxValue = mlPremiumFinalPrice * taxPercent;
  const mlPremiumGrossProfit = mlPremiumFinalPrice - productCost - mlPremiumFixedFee - mlPremiumCommissionValue - mlPremiumTaxValue;
  
  results.push({
    platform: Platform.ML_PREMIUM,
    sellingPrice: mlPremiumFinalPrice,
    productCost: productCost,
    fixedFee: mlPremiumFixedFee,
    commission: mlPremiumCommissionValue,
    tax: mlPremiumTaxValue,
    grossProfit: mlPremiumGrossProfit,
    calculatedMargin: (mlPremiumGrossProfit / mlPremiumFinalPrice) * 100,
    contributionMarginPercent: settings.mercadoLivre.contributionMargin,
    commissionPercent: settings.mercadoLivre.premiumCommission,
    taxPercent: settings.simplesNacional,
  });

  // Shopee
  const shopeeMargin = settings.shopee.contributionMargin / 100;
  const shopeeCommission = settings.shopee.commission / 100;
  const shopeeTotalPercent = shopeeMargin + shopeeCommission + taxPercent;
  const shopeePrice = calculateSellingPrice(productCost, settings.shopee.fixedFee, shopeeTotalPercent);
  const shopeeCommissionValue = shopeePrice * shopeeCommission;
  const shopeeTaxValue = shopeePrice * taxPercent;
  const shopeeGrossProfit = shopeePrice - productCost - settings.shopee.fixedFee - shopeeCommissionValue - shopeeTaxValue;
  results.push({
    platform: Platform.SHOPEE,
    sellingPrice: shopeePrice,
    productCost: productCost,
    fixedFee: settings.shopee.fixedFee,
    commission: shopeeCommissionValue,
    tax: shopeeTaxValue,
    grossProfit: shopeeGrossProfit,
    calculatedMargin: (shopeeGrossProfit / shopeePrice) * 100,
    contributionMarginPercent: settings.shopee.contributionMargin,
    commissionPercent: settings.shopee.commission,
    taxPercent: settings.simplesNacional,
  });

  // TikTok Shop
  const tiktokMargin = settings.tiktok.contributionMargin / 100;
  const tiktokCommission = (settings.tiktok.commission + settings.tiktok.shippingCommission) / 100;
  const tiktokTotalPercent = tiktokMargin + tiktokCommission + taxPercent;
  const tiktokPrice = calculateSellingPrice(productCost, settings.tiktok.fixedFee, tiktokTotalPercent);
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
  const instagramTotalPercent = instagramMargin + taxPercent;
  const instagramPrice = calculateSellingPrice(productCost, 0, instagramTotalPercent);
  const instagramTaxValue = instagramPrice * taxPercent;
  const instagramGrossProfit = instagramPrice - productCost - instagramTaxValue;
  results.push({
    platform: Platform.INSTAGRAM,
    sellingPrice: instagramPrice,
    productCost: productCost,
    fixedFee: 0,
    commission: 0,
    tax: instagramTaxValue,
    grossProfit: instagramGrossProfit,
    calculatedMargin: (instagramGrossProfit / instagramPrice) * 100,
    contributionMarginPercent: settings.instagram.contributionMargin,
    commissionPercent: 0,
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
        let commissionPercent = 0;
        let fixedFee = 0;
        let marginPercent = 0;
        
        switch (platform) {
            case Platform.ML_CLASSICO:
                commissionPercent = settings.mercadoLivre.classicCommission / 100;
                fixedFee = desiredPrice < MERCADO_LIVRE_SHIPPING_THRESHOLD ? settings.mercadoLivre.fixedFee : settings.mercadoLivre.shippingFee;
                marginPercent = settings.mercadoLivre.contributionMargin / 100;
                break;
            case Platform.ML_PREMIUM:
                commissionPercent = settings.mercadoLivre.premiumCommission / 100;
                fixedFee = desiredPrice < MERCADO_LIVRE_SHIPPING_THRESHOLD ? settings.mercadoLivre.fixedFee : settings.mercadoLivre.shippingFee;
                marginPercent = settings.mercadoLivre.contributionMargin / 100;
                break;
            case Platform.SHOPEE:
                commissionPercent = settings.shopee.commission / 100;
                fixedFee = settings.shopee.fixedFee;
                marginPercent = settings.shopee.contributionMargin / 100;
                break;
            case Platform.TIKTOK_SHOP:
                commissionPercent = (settings.tiktok.commission + settings.tiktok.shippingCommission) / 100;
                fixedFee = settings.tiktok.fixedFee;
                marginPercent = settings.tiktok.contributionMargin / 100;
                break;
            case Platform.INSTAGRAM:
                commissionPercent = 0;
                fixedFee = 0;
                marginPercent = settings.instagram.contributionMargin / 100;
                break;
        }

        const commissionValue = desiredPrice * commissionPercent;
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
        });
    });

    return results;
}

export function simulateMargin(productCost: number, sellingPrice: number, settings: AppSettings): CalculationResult[] {
    const results: CalculationResult[] = [];
    const taxPercent = settings.simplesNacional / 100;
    
    const platforms = [
        Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM
    ];

    platforms.forEach(platform => {
        let commissionPercent = 0;
        let fixedFee = 0;

        switch (platform) {
            case Platform.ML_CLASSICO:
                commissionPercent = settings.mercadoLivre.classicCommission / 100;
                fixedFee = sellingPrice < MERCADO_LIVRE_SHIPPING_THRESHOLD ? settings.mercadoLivre.fixedFee : settings.mercadoLivre.shippingFee;
                break;
            case Platform.ML_PREMIUM:
                commissionPercent = settings.mercadoLivre.premiumCommission / 100;
                fixedFee = sellingPrice < MERCADO_LIVRE_SHIPPING_THRESHOLD ? settings.mercadoLivre.fixedFee : settings.mercadoLivre.shippingFee;
                break;
            case Platform.SHOPEE:
                commissionPercent = settings.shopee.commission / 100;
                fixedFee = settings.shopee.fixedFee;
                break;
            case Platform.TIKTOK_SHOP:
                commissionPercent = (settings.tiktok.commission + settings.tiktok.shippingCommission) / 100;
                fixedFee = settings.tiktok.fixedFee;
                break;
            case Platform.INSTAGRAM:
                commissionPercent = 0;
                fixedFee = 0;
                break;
        }

        const commissionValue = sellingPrice * commissionPercent;
        const taxValue = sellingPrice * taxPercent;
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
        });
    });

    return results;
}
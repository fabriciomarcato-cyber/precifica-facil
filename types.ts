
export enum Platform {
  ML_CLASSICO = 'Mercado Livre Clássico',
  ML_PREMIUM = 'Mercado Livre Premium',
  SHOPEE = 'Shopee',
  TIKTOK_SHOP = 'TikTok Shop',
  INSTAGRAM = 'Instagram',
}

export interface MercadoLivreSettings {
  contributionMargin: number;
  classicCommission: number;
  premiumCommission: number;
  productWeight: number;
}

export interface ShopeeSettings {
  contributionMargin: number;
  sellerType: 'cnpj' | 'cpf';
  highVolumeCPF: boolean; // Represents > 450 orders in 90 days
  inCampaign: boolean; // Represents participation in 'Campanhas de Destaque'
}

export interface TikTokShopSettings {
  contributionMargin: number;
  commission: number;
  shippingCommission: number;
  fixedFee: number;
}

export interface InstagramSettings {
  contributionMargin: number;
  machineFeePercent: number;
  machineFeeFixed: number;
  pixFeePercent: number;
  pixFeeFixed: number;
}

export interface AppSettings {
  simplesNacional: number;
  mercadoLivre: MercadoLivreSettings;
  shopee: ShopeeSettings;
  tiktok: TikTokShopSettings;
  instagram: InstagramSettings;
}

export interface CalculationResult {
  platform: Platform;
  sellingPrice?: number;
  productCost?: number;
  fixedFee: number;
  commission: number;
  tax: number;
  grossProfit: number;
  calculatedMargin: number;
  maxProductCost?: number;
  contributionMarginPercent?: number;
  commissionPercent?: number;
  taxPercent?: number;
}
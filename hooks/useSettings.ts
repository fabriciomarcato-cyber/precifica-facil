
import { useState, useEffect } from 'react';
import { AppSettings, ShopeeSettings } from '../types';

const SETTINGS_KEY = 'precificaFacilSettings';

const defaultSettings: AppSettings = {
  simplesNacional: 4,
  mercadoLivre: {
    contributionMargin: 17,
    classicCommission: 14,
    premiumCommission: 19,
    productWeight: 1,
  },
  shopee: {
    contributionMargin: 17,
    sellerType: 'cnpj',
    highVolumeCPF: false,
    inCampaign: false,
  },
  tiktok: {
    contributionMargin: 15,
    affiliateCommission: 0,
    commission: 6,
    shippingCommission: 0,
    fixedFee: 6.00,
  },
  instagram: {
    contributionMargin: 15,
    machineFeePercent: 0,
    machineFeeFixed: 0,
    pixFeePercent: 0,
    pixFeeFixed: 0,
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        // Basic migration: merge stored settings with defaults to add new fields
        const parsedSettings = JSON.parse(storedSettings);
        
        // Ensure obsolete or manual fee overrides are removed so official 2026 table is always used
        if (parsedSettings.mercadoLivre) {
          delete parsedSettings.mercadoLivre.shippingFee;
          delete parsedSettings.mercadoLivre.useManualFixedFee;
          delete parsedSettings.mercadoLivre.manualFixedFeeValue;
        }

        return {
            ...defaultSettings,
            ...parsedSettings,
            mercadoLivre: {...defaultSettings.mercadoLivre, ...parsedSettings.mercadoLivre},
            shopee: {...defaultSettings.shopee, ...parsedSettings.shopee},
            tiktok: {...defaultSettings.tiktok, ...parsedSettings.tiktok},
            instagram: {...defaultSettings.instagram, ...parsedSettings.instagram},
        };
      }
    } catch (error) {
      console.error("Error reading settings from localStorage", error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving settings to localStorage", error);
    }
  }, [settings]);

  return { settings, setSettings };
}
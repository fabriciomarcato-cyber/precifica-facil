
import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

const SETTINGS_KEY = 'precificaFacilSettings';

const defaultSettings: AppSettings = {
  simplesNacional: 4,
  mercadoLivre: {
    contributionMargin: 17,
    classicCommission: 14,
    premiumCommission: 19,
    shippingFee: 24.00,
  },
  shopee: {
    contributionMargin: 17,
    commission: 20,
    fixedFee: 4.00,
  },
  tiktok: {
    contributionMargin: 15,
    commission: 6,
    shippingCommission: 6,
    fixedFee: 2.00,
  },
  instagram: {
    contributionMargin: 15,
  },
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const storedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        // Basic migration: merge stored settings with defaults to add new fields
        const parsedSettings = JSON.parse(storedSettings);
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
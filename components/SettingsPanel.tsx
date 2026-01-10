// FIX: Correctly import `useState` from React to resolve syntax and reference errors.
import React, { useState } from 'react';
import type { AppSettings } from '../types';

interface SettingsPanelProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const SettingsCard: React.FC<React.PropsWithChildren<{ title: string; color: string }>> = ({ title, color, children }) => (
  <div className={`${color} p-6 rounded-lg shadow-md border`}>
    <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

const InputField: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; isCurrency?: boolean }> = ({ label, value, onChange, isCurrency = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-800">{label}</label>
    <div className="mt-1 relative rounded-md shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
        <span className="text-gray-500 sm:text-sm">{isCurrency ? 'R$' : '%'}</span>
      </div>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={onChange}
        className="block w-full rounded-md border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
      />
    </div>
  </div>
);


export default function SettingsPanel({ initialSettings, onSave, isOpen, setIsOpen }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const handleSave = () => {
    onSave(settings);
    alert('Configurações salvas com sucesso!');
    setIsOpen(false);
  };
  
  // FIX: The `section` parameter is now correctly typed to exclude keys of AppSettings that are not objects.
  // This resolves the "Spread types may only be created from object types" error.
  const handleInputChange = (section: Exclude<keyof AppSettings, 'simplesNacional'>, field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setSettings(prev => {
        const updatedSection = { ...prev[section], [field]: numericValue };
        return { ...prev, [section]: updatedSection };
    });
  };

  // FIX: The `field` parameter is now correctly typed to only allow 'simplesNacional',
  // preventing a bug where an object property in settings could be overwritten with a number.
  const handleGeneralChange = (field: 'simplesNacional', value: string) => {
     const numericValue = parseFloat(value) || 0;
     setSettings(prev => ({...prev, [field]: numericValue }));
  }

  if (!isOpen) {
    return (
        <div className="text-center mb-6">
            <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
            Mostrar Configurações
            </button>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Parâmetros Específicos por Plataforma e Gerais</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md border">
           <h3 className="text-xl font-bold text-gray-900 mb-4">Imposto Geral</h3>
            <InputField
              label="Simples Nacional (%):"
              value={settings.simplesNacional}
              onChange={(e) => handleGeneralChange('simplesNacional', e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <SettingsCard title="Mercado Livre" color="bg-white">
            <InputField label="Margem Contribuição ML (%):" value={settings.mercadoLivre.contributionMargin} onChange={(e) => handleInputChange('mercadoLivre', 'contributionMargin', e.target.value)} />
            <InputField label="Comissão Anúncio Clássico (%):" value={settings.mercadoLivre.classicCommission} onChange={(e) => handleInputChange('mercadoLivre', 'classicCommission', e.target.value)} />
            <InputField label="Comissão Anúncio Premium (%):" value={settings.mercadoLivre.premiumCommission} onChange={(e) => handleInputChange('mercadoLivre', 'premiumCommission', e.target.value)} />
            <InputField label="Taxa Fixa Produtos abaixo de R$ 79,00:" value={settings.mercadoLivre.fixedFee} onChange={(e) => handleInputChange('mercadoLivre', 'fixedFee', e.target.value)} isCurrency/>
            <InputField label="Valor Frete Grátis Pago pelo Vendedor:" value={settings.mercadoLivre.shippingFee} onChange={(e) => handleInputChange('mercadoLivre', 'shippingFee', e.target.value)} isCurrency/>
          </SettingsCard>

          <SettingsCard title="Shopee" color="bg-white">
            <InputField label="Margem Contribuição Shopee (%):" value={settings.shopee.contributionMargin} onChange={(e) => handleInputChange('shopee', 'contributionMargin', e.target.value)} />
            <InputField label="Comissão Shopee (%):" value={settings.shopee.commission} onChange={(e) => handleInputChange('shopee', 'commission', e.target.value)} />
            <InputField label="Taxa Fixa Shopee:" value={settings.shopee.fixedFee} onChange={(e) => handleInputChange('shopee', 'fixedFee', e.target.value)} isCurrency/>
          </SettingsCard>
          
          <SettingsCard title="TikTok Shop" color="bg-white">
            <InputField label="Margem Contribuição TikTok (%):" value={settings.tiktok.contributionMargin} onChange={(e) => handleInputChange('tiktok', 'contributionMargin', e.target.value)} />
            <InputField label="Comissão Fixa (%):" value={settings.tiktok.commission} onChange={(e) => handleInputChange('tiktok', 'commission', e.target.value)} />
            <InputField label="Comissão Frete Grátis (%):" value={settings.tiktok.shippingCommission} onChange={(e) => handleInputChange('tiktok', 'shippingCommission', e.target.value)} />
            <InputField label="Taxas Adicionais:" value={settings.tiktok.fixedFee} onChange={(e) => handleInputChange('tiktok', 'fixedFee', e.target.value)} isCurrency/>
          </SettingsCard>

          <SettingsCard title="Instagram" color="bg-white">
            <InputField label="Margem Contribuição Instagram (%):" value={settings.instagram.contributionMargin} onChange={(e) => handleInputChange('instagram', 'contributionMargin', e.target.value)} />
          </SettingsCard>
        </div>

        <div className="flex justify-start pt-4">
          <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
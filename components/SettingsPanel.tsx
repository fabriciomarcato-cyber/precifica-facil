
// FIX: Correctly import `useState` from React to resolve syntax and reference errors.
import React, { useState } from 'react';
// FIX: The Platform enum is used as a value in `marketplaceStyles`, so it must be imported as a value, not just a type.
import { Platform, type AppSettings } from '../types';
import { getMarketplaceIcon } from './MarketplaceIcons';
import { LockIcon, SettingsIcon } from './CustomIcons';

interface SettingsPanelProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  accessLevel: 'restricted' | 'full';
}

const marketplaceStyles = {
    mercadoLivre: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-400',
        title: 'text-yellow-900',
        platform: Platform.ML_CLASSICO,
    },
    shopee: {
        bg: 'bg-orange-50',
        border: 'border-orange-400',
        title: 'text-orange-900',
        platform: Platform.SHOPEE,
    },
    tiktok: {
        bg: 'bg-gray-100',
        border: 'border-gray-500',
        title: 'text-gray-900',
        platform: Platform.TIKTOK_SHOP,
    },
    instagram: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-400',
        title: 'text-indigo-900',
        platform: Platform.INSTAGRAM,
    }
};

type Marketplace = keyof typeof marketplaceStyles;

const SettingsCard: React.FC<React.PropsWithChildren<{ title: string; marketplace: Marketplace; disabled?: boolean }>> = ({ title, marketplace, children, disabled }) => {
    const style = marketplaceStyles[marketplace];
    return (
        <div className={`relative ${style.bg} ${style.border} p-6 rounded-lg shadow-md border-2 ${disabled ? 'opacity-60' : ''}`}>
            {disabled && (
                 <div className="absolute inset-0 bg-gray-50 bg-opacity-70 flex items-center justify-center rounded-lg z-10 flex-col p-4 text-center">
                    <LockIcon className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-sm font-bold text-gray-600">Ative o acesso completo para usar este recurso</span>
                 </div>
            )}
            <div className={disabled ? 'pointer-events-none' : ''}>
                <div className="flex items-center gap-3 mb-4">
                    {getMarketplaceIcon(style.platform)}
                    <h3 className={`text-xl font-bold ${style.title}`}>{title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children}
                </div>
            </div>
        </div>
    );
};


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


export default function SettingsPanel({ initialSettings, onSave, isOpen, setIsOpen, accessLevel }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const isRestricted = accessLevel === 'restricted';

  const handleSave = () => {
    onSave(settings);
    alert('Configurações salvas com sucesso!');
    setIsOpen(false);
  };
  
  const handleInputChange = (section: Exclude<keyof AppSettings, 'simplesNacional'>, field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setSettings(prev => {
        const updatedSection = { ...prev[section], [field]: numericValue };
        return { ...prev, [section]: updatedSection };
    });
  };

  const handleGeneralChange = (field: 'simplesNacional', value: string) => {
     const numericValue = parseFloat(value) || 0;
     setSettings(prev => ({...prev, [field]: numericValue }));
  }

  if (!isOpen) {
    return (
        <div className="text-center mb-6">
            <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg animate-infrequent-pulse flex items-center gap-2 mx-auto"
            >
            <SettingsIcon className="w-5 h-5"/>
            Clique Aqui Para Configuração
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg shadow-md border-2 border-blue-200">
           <h3 className="text-xl font-bold text-blue-900 mb-4">Imposto Geral (Simples Nacional - Anexo I Comércio)</h3>
            <div>
              <label htmlFor="simplesNacional" className="block text-sm font-medium text-gray-800">Faixa de Faturamento (últimos 12 meses):</label>
              <select
                id="simplesNacional"
                value={settings.simplesNacional}
                onChange={(e) => handleGeneralChange('simplesNacional', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
              >
                <option value="0">MEI - Isento (0%)</option>
                <option value="4">1ª Faixa - Faturamento até R$ 180 mil (4,00%)</option>
                <option value="7.3">2ª Faixa - Faturamento de R$ 180 mil a R$ 360 mil (7,30%)</option>
                <option value="9.5">3ª Faixa - Faturamento de R$ 360 mil a R$ 720 mil (9,50%)</option>
                <option value="10.7">4ª Faixa - Faturamento de R$ 720 mil a R$ 1,8 mi (10,70%)</option>
                <option value="14.3">5ª Faixa - Faturamento de R$ 1,8 mi a R$ 3,6 mi (14,30%)</option>
                <option value="19">6ª Faixa - Faturamento de R$ 3,6 mi a R$ 4,8 mi (19,00%)</option>
              </select>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <SettingsCard title="Mercado Livre" marketplace="mercadoLivre" disabled={isRestricted}>
            <InputField label="Margem Contribuição ML (%):" value={settings.mercadoLivre.contributionMargin} onChange={(e) => handleInputChange('mercadoLivre', 'contributionMargin', e.target.value)} />
            <InputField label="Comissão Anúncio Clássico (%):" value={settings.mercadoLivre.classicCommission} onChange={(e) => handleInputChange('mercadoLivre', 'classicCommission', e.target.value)} />
            <InputField label="Comissão Anúncio Premium (%):" value={settings.mercadoLivre.premiumCommission} onChange={(e) => handleInputChange('mercadoLivre', 'premiumCommission', e.target.value)} />
            <InputField label="Valor Frete Grátis Pago pelo Vendedor:" value={settings.mercadoLivre.shippingFee} onChange={(e) => handleInputChange('mercadoLivre', 'shippingFee', e.target.value)} isCurrency/>
          </SettingsCard>

          <SettingsCard title="Shopee" marketplace="shopee">
            <InputField label="Margem Contribuição Shopee (%):" value={settings.shopee.contributionMargin} onChange={(e) => handleInputChange('shopee', 'contributionMargin', e.target.value)} />
            <InputField label="Comissão Shopee (%):" value={settings.shopee.commission} onChange={(e) => handleInputChange('shopee', 'commission', e.target.value)} />
            <InputField label="Taxa Fixa Shopee:" value={settings.shopee.fixedFee} onChange={(e) => handleInputChange('shopee', 'fixedFee', e.target.value)} isCurrency/>
          </SettingsCard>
          
          <SettingsCard title="TikTok Shop" marketplace="tiktok" disabled={isRestricted}>
            <InputField label="Margem Contribuição TikTok (%):" value={settings.tiktok.contributionMargin} onChange={(e) => handleInputChange('tiktok', 'contributionMargin', e.target.value)} />
            <InputField label="Comissão Fixa (%):" value={settings.tiktok.commission} onChange={(e) => handleInputChange('tiktok', 'commission', e.target.value)} />
            <InputField label="Comissão Frete Grátis (%):" value={settings.tiktok.shippingCommission} onChange={(e) => handleInputChange('tiktok', 'shippingCommission', e.target.value)} />
            <InputField label="Taxas Adicionais:" value={settings.tiktok.fixedFee} onChange={(e) => handleInputChange('tiktok', 'fixedFee', e.target.value)} isCurrency/>
          </SettingsCard>

          <SettingsCard title="Instagram" marketplace="instagram" disabled={isRestricted}>
            <div className="md:col-span-2">
                <InputField label="Margem Contribuição Instagram (%):" value={settings.instagram.contributionMargin} onChange={(e) => handleInputChange('instagram', 'contributionMargin', e.target.value)} />
            </div>
            <div className="md:col-span-2 mt-4 pt-4 border-t border-indigo-200">
                <h4 className="font-semibold text-indigo-800">Custos de Recebimento de Pagamento</h4>
                <p className="text-xs text-gray-500 mb-2">Use estes campos para simular taxas de maquininha, PIX ou intermediadores de pagamento usados em vendas via Instagram.</p>
            </div>
            <InputField label="Taxa da Maquininha (%):" value={settings.instagram.machineFeePercent} onChange={(e) => handleInputChange('instagram', 'machineFeePercent', e.target.value)} />
            <InputField label="Taxa Fixa da Maquininha (R$):" value={settings.instagram.machineFeeFixed} onChange={(e) => handleInputChange('instagram', 'machineFeeFixed', e.target.value)} isCurrency />
            <InputField label="Taxa PIX (%):" value={settings.instagram.pixFeePercent} onChange={(e) => handleInputChange('instagram', 'pixFeePercent', e.target.value)} />
            <InputField label="Taxa Fixa PIX (R$):" value={settings.instagram.pixFeeFixed} onChange={(e) => handleInputChange('instagram', 'pixFeeFixed', e.target.value)} isCurrency />
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
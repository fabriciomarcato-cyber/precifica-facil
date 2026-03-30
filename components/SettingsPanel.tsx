
// FIX: Correctly import `useState` from React to resolve syntax and reference errors.
import React, { useState } from 'react';
// FIX: The Platform enum is used as a value in `marketplaceStyles`, so it must be imported as a value, not just a type.
import { Platform, type AppSettings, ShopeeSettings } from '../types';
import { getMarketplaceIcon } from './MarketplaceIcons';
import { Lock, Settings } from 'lucide-react';

interface SettingsPanelProps {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  accessLevel: 'restricted' | 'full';
}

const getPlatformColor = (platform: Platform) => {
  switch (platform) {
    case Platform.ML_CLASSICO:
    case Platform.ML_PREMIUM:
      return 'bg-[#FFE600] border-yellow-400 text-gray-900';
    case Platform.SHOPEE:
      return 'bg-gradient-to-b from-[#EE4D2D] to-[#FF6321] border-orange-600 text-white';
    case Platform.TIKTOK_SHOP:
      return 'bg-[#E9EBF0] border-gray-300 text-gray-900';
    case Platform.INSTAGRAM:
      return 'bg-blue-50 border-blue-200 text-gray-900';
    default:
      return 'bg-white border-gray-200 text-gray-900';
  }
};

const SettingsCard: React.FC<React.PropsWithChildren<{ title: string; platform: Platform; disabled?: boolean }>> = ({ title, platform, children, disabled }) => {
    const colorClasses = getPlatformColor(platform);
    const isShopee = platform === Platform.SHOPEE;
    
    return (
        <div className={`relative ${colorClasses} p-6 rounded-xl shadow-lg border-2 transition-all ${disabled ? 'opacity-60' : 'hover:shadow-xl'}`}>
            {disabled && (
                 <div className="absolute inset-0 bg-gray-50 bg-opacity-70 flex items-center justify-center rounded-xl z-10 flex-col p-4 text-center">
                    <Lock className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-tight">Recurso Pro</span>
                 </div>
            )}
            <div className={disabled ? 'pointer-events-none' : ''}>
                <div className="mb-6 text-center">
                    <h3 className={`text-xl font-black uppercase tracking-tight ${isShopee ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children}
                </div>
            </div>
        </div>
    );
};


const InputField: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; unit?: string; isShopee?: boolean }> = ({ label, value, onChange, unit, isShopee }) => (
  <div className="w-full">
    <label className={`block text-[10px] font-black uppercase tracking-wider leading-tight mb-1 ${isShopee ? 'text-white/90' : 'text-gray-600'}`}>{label}</label>
    <div className="relative rounded-lg shadow-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 pl-2.5 flex items-center">
        <span className={`${isShopee ? 'text-white/70' : 'text-gray-500'} text-[10px] font-bold`}>{unit}</span>
      </div>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={onChange}
        className={`block w-full rounded-lg border-0 pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-white/50 text-sm font-bold shadow-inner transition-all ${isShopee ? 'bg-white/10 text-white placeholder-white/40 ring-1 ring-white/20' : 'bg-white text-gray-900 ring-1 ring-gray-300'}`}
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
  
  const handleInputChange = (section: Exclude<keyof AppSettings, 'simplesNacional' | 'shopee'>, field: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setSettings(prev => {
        const updatedSection = { ...prev[section], [field]: numericValue };
        return { ...prev, [section]: updatedSection };
    });
  };
  
  const handleShopeeSettingChange = (field: keyof ShopeeSettings, value: string | boolean | number) => {
    setSettings(prev => {
        const newShopeeSettings = { ...prev.shopee, [field]: value };
        // Logic to reset highVolumeCPF if sellerType is changed to cnpj
        if (field === 'sellerType' && value === 'cnpj') {
            newShopeeSettings.highVolumeCPF = false;
        }
        return { ...prev, shopee: newShopeeSettings };
    });
  };

  const handleGeneralChange = (field: 'simplesNacional', value: string) => {
     const numericValue = parseFloat(value) || 0;
     setSettings(prev => ({...prev, [field]: numericValue }));
  }

  const handleToggleChange = (section: 'mercadoLivre', field: string, value: boolean) => {
    setSettings(prev => {
        const updatedSection = { ...prev[section], [field]: value };
        return { ...prev, [section]: updatedSection };
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header - Sticky */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Parâmetros Específicos por Plataforma e Gerais</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-800 p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
            <h3 className="text-xl font-bold text-blue-900 mb-4">Imposto Geral (Simples Nacional - Anexo I Comércio)</h3>
            <div>
              <label htmlFor="simplesNacional" className="block text-sm font-medium text-gray-800">Faixa de Faturamento (últimos 12 meses):</label>
              <select
                id="simplesNacional"
                value={settings.simplesNacional}
                onChange={(e) => handleGeneralChange('simplesNacional', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-400 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
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
            <SettingsCard title="Mercado Livre" platform={Platform.ML_CLASSICO}>
              <InputField label="Margem Contribuição (%):" unit="%" value={settings.mercadoLivre.contributionMargin} onChange={(e) => handleInputChange('mercadoLivre', 'contributionMargin', e.target.value)} />
              <InputField label="Peso Volumétrico do Produto (kg):" unit="kg" value={settings.mercadoLivre.productWeight} onChange={(e) => handleInputChange('mercadoLivre', 'productWeight', e.target.value)} />
              <InputField label="Comissão Clássico (%):" unit="%" value={settings.mercadoLivre.classicCommission} onChange={(e) => handleInputChange('mercadoLivre', 'classicCommission', e.target.value)} />
              <InputField label="Comissão Premium (%):" unit="%" value={settings.mercadoLivre.premiumCommission} onChange={(e) => handleInputChange('mercadoLivre', 'premiumCommission', e.target.value)} />
              
              <div className="md:col-span-2 space-y-3 pt-4 border-t border-black/10 mt-2">
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={settings.mercadoLivre.useManualFixedFee} 
                    onChange={(e) => handleToggleChange('mercadoLivre', 'useManualFixedFee', e.target.checked)}
                    className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500 transition-all" 
                  />
                  <span className="ml-3 text-sm font-black uppercase tracking-tight text-gray-700 group-hover:text-black transition-colors">Usar Taxa Fixa/Frete Manual</span>
                </label>
                
                {settings.mercadoLivre.useManualFixedFee && (
                  <InputField 
                    label="Valor Taxa Fixa/Frete (R$):" 
                    unit="R$" 
                    value={settings.mercadoLivre.manualFixedFeeValue} 
                    onChange={(e) => handleInputChange('mercadoLivre', 'manualFixedFeeValue', e.target.value)} 
                  />
                )}
              </div>
            </SettingsCard>

            <SettingsCard title="Shopee" platform={Platform.SHOPEE}>
              <div className="md:col-span-2">
                <InputField isShopee label="Margem Contribuição Shopee (%):" unit="%" value={settings.shopee.contributionMargin} onChange={(e) => handleShopeeSettingChange('contributionMargin', parseFloat(e.target.value) || 0)} />
              </div>
              <div className='md:col-span-2 space-y-4'>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-white/80 mb-2">Tipo de Vendedor</label>
                  <div className="mt-2 flex items-center gap-x-6 gap-y-2">
                    <label className="flex items-center text-sm font-bold cursor-pointer group"><input type="radio" value="cnpj" name="sellerType" checked={settings.shopee.sellerType === 'cnpj'} onChange={(e) => handleShopeeSettingChange('sellerType', e.target.value)} className="h-5 w-5 border-white/30 bg-white/10 text-white focus:ring-white/50" /> <span className="ml-2 text-white group-hover:text-white/80 transition-colors">CNPJ</span></label>
                    <label className="flex items-center text-sm font-bold cursor-pointer group"><input type="radio" value="cpf" name="sellerType" checked={settings.shopee.sellerType === 'cpf'} onChange={(e) => handleShopeeSettingChange('sellerType', e.target.value)} className="h-5 w-5 border-white/30 bg-white/10 text-white focus:ring-white/50" /> <span className="ml-2 text-white group-hover:text-white/80 transition-colors">CPF</span></label>
                  </div>
                </div>
                {settings.shopee.sellerType === 'cpf' && (
                  <div className="pl-1">
                    <label className="flex items-center cursor-pointer group">
                      <input type="checkbox" checked={settings.shopee.highVolumeCPF} onChange={(e) => handleShopeeSettingChange('highVolumeCPF', e.target.checked)} className="h-5 w-5 rounded border-white/30 bg-white/10 text-white focus:ring-white/50" />
                      <span className="ml-3 text-sm font-bold text-white group-hover:text-white/80 transition-colors">Mais de 450 pedidos/90 dias (+R$3)</span>
                    </label>
                  </div>
                )}
                <div>
                  <label className="flex items-center cursor-pointer group">
                    <input type="checkbox" checked={settings.shopee.inCampaign} onChange={(e) => handleShopeeSettingChange('inCampaign', e.target.checked)} className="h-5 w-5 rounded border-white/30 bg-white/10 text-white focus:ring-white/50" />
                    <span className="ml-3 text-sm font-bold text-white group-hover:text-white/80 transition-colors">Campanhas de Destaque (+2.5%)</span>
                  </label>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="TikTok Shop" platform={Platform.TIKTOK_SHOP}>
              <InputField label="Margem Contribuição TikTok (%):" unit="%" value={settings.tiktok.contributionMargin} onChange={(e) => handleInputChange('tiktok', 'contributionMargin', e.target.value)} />
              <InputField label="Comissão Fixa (%):" unit="%" value={settings.tiktok.commission} onChange={(e) => handleInputChange('tiktok', 'commission', e.target.value)} />
              <InputField label="Comissão Frete Grátis (%):" unit="%" value={settings.tiktok.shippingCommission} onChange={(e) => handleInputChange('tiktok', 'shippingCommission', e.target.value)} />
              <InputField label="Taxas Adicionais:" unit="R$" value={settings.tiktok.fixedFee} onChange={(e) => handleInputChange('tiktok', 'fixedFee', e.target.value)} />
            </SettingsCard>

            <SettingsCard title="Instagram" platform={Platform.INSTAGRAM}>
              <div className="md:col-span-2">
                <InputField label="Margem Contribuição Instagram (%):" unit="%" value={settings.instagram.contributionMargin} onChange={(e) => handleInputChange('instagram', 'contributionMargin', e.target.value)} />
              </div>
              <div className="md:col-span-2 mt-4 pt-4 border-t border-black/10">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Custos de Recebimento</h4>
              </div>
              <InputField label="Taxa da Maquininha (%):" unit="%" value={settings.instagram.machineFeePercent} onChange={(e) => handleInputChange('instagram', 'machineFeePercent', e.target.value)} />
              <InputField label="Taxa Fixa da Maquininha (R$):" unit="R$" value={settings.instagram.machineFeeFixed} onChange={(e) => handleInputChange('instagram', 'machineFeeFixed', e.target.value)} />
              <InputField label="Taxa PIX (%):" unit="%" value={settings.instagram.pixFeePercent} onChange={(e) => handleInputChange('instagram', 'pixFeePercent', e.target.value)} />
              <InputField label="Taxa Fixa PIX (R$):" unit="R$" value={settings.instagram.pixFeeFixed} onChange={(e) => handleInputChange('instagram', 'pixFeeFixed', e.target.value)} />
            </SettingsCard>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-6 py-3 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors shadow-md order-1 sm:order-2"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
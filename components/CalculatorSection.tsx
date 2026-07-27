
import React, { useState, useEffect } from 'react';
import { AppSettings, CalculationResult, Platform } from '../types';
import { 
    calculateIndividualPrices, 
    calculateMaxCost, 
    simulateMargin,
    formatCurrency,
    formatPercentage
} from '../lib/calculator';
import { getMarketplaceIcon } from './MarketplaceIcons';
import { Lock, AlertTriangle } from 'lucide-react';

import ShopeeBatchConference from './ShopeeBatchConference';
import VolumetricWeightCalculator from './VolumetricWeightCalculator';

interface CalculatorSectionProps {
  settings: AppSettings;
  accessLevel: 'restricted' | 'full';
  activate: (code: string) => Promise<{ success: boolean; message?: string }>;
  expiration: number | null;
  accessMessage: string;
  revalidateAccess: () => boolean;
}

const LockedPlatformCard: React.FC<{ platform: Platform }> = ({ platform }) => (
    <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50/50 h-full min-h-[480px] shadow-sm group hover:border-blue-200 transition-colors">
         <div className="text-center space-y-12">
            <h3 className="text-2xl font-black text-gray-300 uppercase tracking-widest group-hover:text-blue-200 transition-colors">
                {(platform === Platform.ML_CLASSICO || platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : platform}
            </h3>
            <div className="flex flex-col items-center">
                <div className="p-8 bg-white rounded-full mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                    <Lock className="w-16 h-16 text-blue-600/20" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">PLANO PRO</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">RECURSO BLOQUEADO</p>
                </div>
            </div>
         </div>
    </div>
);

const FreebieBadge: React.FC = () => (
    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-[#16A34A] text-white px-6 py-2 rounded-full shadow-2xl border-4 border-white flex flex-col items-center leading-tight scale-110">
            <span className="text-[10px] font-black uppercase tracking-tighter">Demonstração</span>
            <span className="text-sm font-black uppercase tracking-tighter">Gratuita</span>
        </div>
    </div>
);

const ProFeatureWrapper: React.FC<{ isRestricted: boolean; children: React.ReactNode }> = ({ isRestricted, children }) => {
  return (
    <div className="relative">
      <div className={isRestricted ? 'blur-[4px] pointer-events-none select-none opacity-60' : ''}>
        {children}
      </div>
      {isRestricted && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/10 backdrop-blur-[2px] rounded-xl">
          <div className="bg-white/90 p-6 rounded-2xl shadow-2xl border-2 border-blue-500 flex items-center gap-3 transform scale-110">
            <span className="text-xl font-black text-gray-900 uppercase tracking-tight">🔒 Função disponível apenas na Versão Pró</span>
          </div>
        </div>
      )}
    </div>
  );
};


const Card: React.FC<React.PropsWithChildren<{ title: string; subtitle: string; }>> = ({ title, subtitle, children }) => (
    <div className="relative bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
        <div className="border-b pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        {children}
    </div>
);


const getPlatformColor = (platform: Platform, isNegative: boolean) => {
    if (isNegative) return 'bg-red-50 border-red-400 text-gray-900';
    
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
            return 'bg-slate-100 border-slate-200 text-gray-900';
    }
};

export default function CalculatorSection({ settings, accessLevel, activate, expiration, accessMessage, revalidateAccess }: CalculatorSectionProps) {
  const [productCost, setProductCost] = useState('');
  const [desiredPrice, setDesiredPrice] = useState('');
  const [simProductCost, setSimProductCost] = useState('');
  const [simSellingPrice, setSimSellingPrice] = useState('');

  const [priceResults, setPriceResults] = useState<CalculationResult[]>([]);
  const [inverseResults, setInverseResults] = useState<CalculationResult[]>([]);
  const [marginResults, setMarginResults] = useState<CalculationResult[]>([]);
  
  const [priceCalcError, setPriceCalcError] = useState('');
  const [inverseCalcError, setInverseCalcError] = useState('');
  const [marginSimError, setMarginSimError] = useState('');

  const isRestricted = accessLevel === 'restricted';
  
  useEffect(() => { priceResults.length > 0 && setPriceResults([]); priceCalcError && setPriceCalcError(''); }, [productCost, settings]);
  useEffect(() => { inverseResults.length > 0 && setInverseResults([]); inverseCalcError && setInverseCalcError(''); }, [desiredPrice, settings]);
  useEffect(() => { marginResults.length > 0 && setMarginResults([]); marginSimError && setMarginSimError(''); }, [simProductCost, simSellingPrice, settings]);

  
  const handlePriceCalculation = () => {
    revalidateAccess();
    const cost = parseFloat(productCost);
    const weight = settings.mercadoLivre.productWeight;
    if (!isNaN(cost) && cost > 0 && !isNaN(weight) && weight > 0) {
      setPriceCalcError('');
      setPriceResults(calculateIndividualPrices(cost, weight, settings));
    } else {
      setPriceCalcError('Insira um custo válido e defina o peso do produto nas Configurações.');
      setPriceResults([]);
    }
  };
  
  const handleInverseCalculation = () => {
    revalidateAccess();
    const price = parseFloat(desiredPrice);
    const weight = settings.mercadoLivre.productWeight;
    if (!isNaN(price) && price > 0 && !isNaN(weight) && weight > 0) {
      setInverseCalcError('');
      setInverseResults(calculateMaxCost(price, weight, settings));
    } else {
      setInverseCalcError('Insira um preço de venda válido e defina o peso do produto nas Configurações.');
      setInverseResults([]);
    }
  };

  const handleMarginSimulation = () => {
    revalidateAccess();
    const cost = parseFloat(simProductCost);
    const price = parseFloat(simSellingPrice);
    const weight = settings.mercadoLivre.productWeight;
    if (!isNaN(cost) && !isNaN(price) && !isNaN(weight) && cost > 0 && price > 0 && weight > 0) {
      setMarginSimError('');
      setMarginResults(simulateMargin(cost, price, weight, settings));
    } else {
      setMarginSimError('Insira custo e preço válidos, e defina o peso do produto nas Configurações.');
      setMarginResults([]);
    }
  };
  
  const allPlatforms: Platform[] = [Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM];
  
  const activePricePlatforms = allPlatforms;
  const lockedPricePlatforms: Platform[] = [];
  const displayedPriceResults = priceResults.filter(r => activePricePlatforms.includes(r.platform));
  
  const activeInversePlatforms = allPlatforms;
  const lockedInversePlatforms: Platform[] = [];
  const displayedInverseResults = inverseResults.filter(r => activeInversePlatforms.includes(r.platform));

  const activeMarginPlatforms = allPlatforms;
  const lockedMarginPlatforms: Platform[] = [];
  const displayedMarginResults = marginResults.filter(r => activeMarginPlatforms.includes(r.platform));

  return (
    <>
      <Card 
        title="Cálculo de Preço de Venda"
        subtitle="Informe o custo do produto e veja o preço de venda ideal em cada canal."
      >
        <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="w-full sm:w-48">
                <label htmlFor="productCost" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Custo do Produto (R$):</label>
                <input
                    id="productCost"
                    type="number"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    placeholder="Ex: 25.00"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"
                />
            </div>
            <button
                onClick={handlePriceCalculation}
                className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
                Calcular Preço de Venda
            </button>
        </div>
        {priceCalcError && <p className="text-red-600 text-sm mt-2">{priceCalcError}</p>}
        
        {priceResults.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {displayedPriceResults.map((res) => {
                    const isDemo = false; // No demo mode for price calculation as all are accessible
                    const isNegative = res.grossProfit < 0;
                    const colorClasses = getPlatformColor(res.platform, isNegative);
                    return (
                    <div key={res.platform} className={`relative ${isDemo ? 'pt-20 pb-8 px-6' : 'p-6'} rounded-2xl border flex flex-col ${colorClasses} min-h-[480px] shadow-xl transition-transform hover:scale-[1.02]`}>
                        {isDemo && <FreebieBadge />}
                        
                        <div className="mb-6 text-center">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <h3 className="text-xl font-black uppercase tracking-tight">
                                        {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                    </h3>
                                    { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                            {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                        </span>
                                    )}
                                </div>
                                {res.platform === Platform.SHOPEE && (
                                    <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">CÁLCULO: {settings.shopee.sellerType}</p>
                                )}
                                {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                    <p className="text-[10px] opacity-60 font-bold">Peso: {settings.mercadoLivre.productWeight}kg</p>
                                )}
                                {res.platform === Platform.TIKTOK_SHOP && (
                                    <div className="text-[10px] opacity-80 font-bold flex flex-col items-center">
                                        <span>{res.sellingPrice && res.sellingPrice < 50 ? '10% + R$ 4,00 (< R$ 50)' : '6% + R$ 6,00 (≥ R$ 50)'}</span>
                                        {(settings.tiktok.affiliateCommission || 0) > 0 && (
                                            <span className="text-blue-700 font-extrabold">+ {settings.tiktok.affiliateCommission}% Afiliado</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-center mb-8">
                            <p className="opacity-60 text-sm font-bold mb-1">Preço mínimo de Venda</p>
                            <p className={`text-5xl font-black tracking-tighter ${isNegative ? 'text-red-700' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]')}`}>{formatCurrency(res.sellingPrice)}</p>
                        </div>

                        <div className="w-full space-y-3.5 flex-grow text-sm font-medium">
                            <div className="flex justify-between items-center">
                                <span className="opacity-60">Custo do Produto</span>
                                <span className="font-black">{formatCurrency(res.productCost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="opacity-60">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                <span className="font-black">{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="opacity-60">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                <span className="font-black">{formatCurrency(res.commission)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="opacity-60">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                <span className="font-black">{formatCurrency(res.tax)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="opacity-60">Taxa Fixa/Frete</span>
                                <span className="font-black">{formatCurrency(res.fixedFee)}</span>
                            </div>
                        </div>

                        <div className={`w-full border-t mt-6 pt-4 space-y-3 ${isNegative ? 'border-red-300' : 'border-black/10'}`}>
                            <div className="flex justify-between items-center">
                                <span className={`text-lg font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>Lucro Bruto</span>
                                <span className={`text-xl font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-lg font-black ${res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]'}`}>Margem Final</span>
                                <span className={`text-xl font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]')}`}>{formatPercentage(res.calculatedMargin)}</span>
                            </div>
                            {isNegative && (
                                <div className="flex items-center justify-center mt-2 text-red-800 font-black text-xs gap-1 animate-pulse">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>PREJUÍZO DETECTADO</span>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
                 {lockedPricePlatforms.map(platform => <LockedPlatformCard key={platform} platform={platform} />)}
            </div>
        ) : (
            <div className="text-center text-gray-500 py-12"><p className="text-lg">Digite o custo do produto e clique em "Calcular Preço de Venda".</p></div>
        )}
      </Card>

      <Card 
          title="Cálculo Inverso - Qual Custo Comprar?"
          subtitle="Defina o preço de venda e descubra o custo máximo de compra para manter sua margem de lucro."
      >
          <ProFeatureWrapper isRestricted={isRestricted}>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="w-full sm:w-48">
                      <label htmlFor="desiredPrice" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Preço de Venda Desejado (R$):</label>
                      <input id="desiredPrice" type="number" value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value)} placeholder="120.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900" disabled={isRestricted}/>
                  </div>
                  <button onClick={handleInverseCalculation} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm" disabled={isRestricted}>Calcular Custo Máximo</button>
              </div>
              {inverseCalcError && <p className="text-red-600 text-sm mt-2">{inverseCalcError}</p>}
              {inverseResults.length > 0 ? (
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {displayedInverseResults.map((res) => {
                          const isNegative = res.maxProductCost && res.maxProductCost < 0;
                          const isDemo = false;
                          const colorClasses = getPlatformColor(res.platform, !!isNegative);
                          return (
                              <div key={res.platform} className={`relative ${isDemo ? 'pt-20 pb-8 px-6' : 'p-6'} rounded-2xl border flex flex-col ${colorClasses} min-h-[480px] shadow-xl transition-transform hover:scale-[1.02]`}>
                                  {isDemo && <FreebieBadge />}
                                  
                                  <div className="mb-6 text-center">
                                      <div className="flex flex-col items-center">
                                          <div className="flex items-center justify-center gap-2 mb-1">
                                              <h3 className="text-xl font-black uppercase tracking-tight">
                                                  {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                              </h3>
                                              { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                                      {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                                  </span>
                                              )}
                                          </div>
                                          {res.platform === Platform.SHOPEE && (
                                              <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">CÁLCULO: {settings.shopee.sellerType}</p>
                                          )}
                                          {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                              <p className="text-[10px] opacity-60 font-bold">Peso: {settings.mercadoLivre.productWeight}kg</p>
                                          )}
                                          {res.platform === Platform.TIKTOK_SHOP && (
                                              <div className="text-[10px] opacity-80 font-bold flex flex-col items-center">
                                                  <span>{res.sellingPrice && res.sellingPrice < 50 ? '10% + R$ 4,00 (< R$ 50)' : '6% + R$ 6,00 (≥ R$ 50)'}</span>
                                                  {(settings.tiktok.affiliateCommission || 0) > 0 && (
                                                      <span className="text-blue-700 font-extrabold">+ {settings.tiktok.affiliateCommission}% Afiliado</span>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  <div className="text-center mb-8">
                                      <p className="opacity-60 text-sm font-bold mb-1">Custo Máximo do Produto</p>
                                      <p className={`text-5xl font-black tracking-tighter ${isNegative ? 'text-red-700' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]')}`}>{formatCurrency(res.maxProductCost)}</p>
                                  </div>

                                  <div className="w-full space-y-3.5 flex-grow text-sm font-medium">
                                      <div className="flex justify-between items-center">
                                          <span className="opacity-60">Preço de Venda</span>
                                          <span className="font-black">{formatCurrency(res.sellingPrice)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="opacity-60">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                          <span className="font-black">{formatCurrency(res.grossProfit)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="opacity-60">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                          <span className="font-black">{formatCurrency(res.commission)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="opacity-60">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                          <span className="font-black">{formatCurrency(res.tax)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="opacity-60">Taxa Fixa/Frete</span>
                                          <span className="font-black">{formatCurrency(res.fixedFee)}</span>
                                      </div>
                                  </div>

                                  <div className={`w-full border-t mt-6 pt-4 space-y-3 ${isNegative ? 'border-red-300' : 'border-black/10'}`}>
                                      <div className="flex justify-between items-center">
                                          <span className={`text-lg font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>Margem Desejada</span>
                                          <span className={`text-xl font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className={`text-lg font-black ${res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]'}`}>Margem Final</span>
                                          <span className={`text-xl font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]')}`}>{formatPercentage(res.calculatedMargin)}</span>
                                      </div>
                                      {isNegative && (
                                          <div className="flex items-center justify-center mt-2 text-red-800 font-black text-xs gap-1 animate-pulse">
                                              <AlertTriangle className="w-4 h-4" />
                                              <span>INVIÁVEL</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                      {lockedInversePlatforms.map(platform => <LockedPlatformCard key={platform} platform={platform} />)}
                  </div>
              ) : (
                  <div className="text-center text-gray-500 py-12"><p>Digite o preço de venda e clique em "Calcular Custo Máximo".</p></div>
              )}
          </ProFeatureWrapper>
      </Card>

      <Card 
          title="Simulação de Margem por Preço de Venda"
          subtitle="Simule diferentes preços para ver automaticamente o lucro e a margem em cada canal."
      >
          <ProFeatureWrapper isRestricted={isRestricted}>
              <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="w-full sm:w-48">
                      <label htmlFor="simProductCost" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Custo Produto (R$):</label>
                      <input id="simProductCost" type="number" value={simProductCost} onChange={(e) => setSimProductCost(e.target.value)} placeholder="25.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900" disabled={isRestricted}/>
                  </div>
                  <div className="w-full sm:w-48">
                      <label htmlFor="simSellingPrice" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Preço de Venda (R$):</label>
                      <input id="simSellingPrice" type="number" value={simSellingPrice} onChange={(e) => setSimSellingPrice(e.target.value)} placeholder="80.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900" disabled={isRestricted}/>
                  </div>
                  <button onClick={handleMarginSimulation} className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 px-6 rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm" disabled={isRestricted}>Simular Margem</button>
              </div>
              {marginSimError && <p className="text-red-600 text-sm mt-2">{marginSimError}</p>}
              {marginResults.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {displayedMarginResults.map((res) => {
                      const isNegative = res.grossProfit < 0;
                      const isDemo = false;
                      const colorClasses = getPlatformColor(res.platform, isNegative);
                      return (
                          <div key={res.platform} className={`relative ${isDemo ? 'pt-20 pb-8 px-6' : 'p-6'} rounded-2xl border flex flex-col ${colorClasses} min-h-[480px] shadow-xl transition-transform hover:scale-[1.02]`}>
                              {isDemo && <FreebieBadge />}
                              
                              <div className="mb-6 text-center">
                                  <div className="flex flex-col items-center">
                                      <div className="flex items-center justify-center gap-2 mb-1">
                                          <h3 className="text-xl font-black uppercase tracking-tight">
                                              {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                          </h3>
                                          { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                                  {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                              </span>
                                          )}
                                      </div>
                                      {res.platform === Platform.SHOPEE && (
                                          <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">CÁLCULO: {settings.shopee.sellerType}</p>
                                      )}
                                      {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                          <p className="text-[10px] opacity-60 font-bold">Peso: {settings.mercadoLivre.productWeight}kg</p>
                                      )}
                                      {res.platform === Platform.TIKTOK_SHOP && (
                                          <div className="text-[10px] opacity-80 font-bold flex flex-col items-center">
                                              <span>{res.sellingPrice && res.sellingPrice < 50 ? '10% + R$ 4,00 (< R$ 50)' : '6% + R$ 6,00 (≥ R$ 50)'}</span>
                                              {(settings.tiktok.affiliateCommission || 0) > 0 && (
                                                  <span className="text-blue-700 font-extrabold">+ {settings.tiktok.affiliateCommission}% Afiliado</span>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              </div>

                              <div className="text-center mb-8">
                                  <p className="opacity-60 text-sm font-bold mb-1">Lucro Bruto Simulado</p>
                                  <p className={`text-5xl font-black tracking-tighter ${isNegative ? 'text-red-700' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</p>
                              </div>

                              <div className="w-full space-y-3.5 flex-grow text-sm font-medium">
                                  <div className="flex justify-between items-center">
                                      <span className="opacity-60">Preço de Venda</span>
                                      <span className="font-black">{formatCurrency(res.sellingPrice)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="opacity-60">Custo do Produto</span>
                                      <span className="font-black">{formatCurrency(res.productCost)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="opacity-60">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                      <span className="font-black">{formatCurrency(res.commission)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="opacity-60">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                      <span className="font-black">{formatCurrency(res.tax)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="opacity-60">Taxa Fixa/Frete</span>
                                      <span className="font-black">{formatCurrency(res.fixedFee)}</span>
                                  </div>
                              </div>

                              <div className={`w-full border-t mt-6 pt-4 space-y-3 ${isNegative ? 'border-red-300' : 'border-black/10'}`}>
                                  <div className="flex justify-between items-center">
                                      <span className={`text-lg font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>Lucro Bruto</span>
                                      <span className={`text-xl font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className={`text-lg font-black ${res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]'}`}>Margem Final</span>
                                      <span className={`text-xl font-black ${isNegative ? 'text-red-800' : (res.platform === Platform.SHOPEE ? 'text-white' : 'text-[#2563EB]')}`}>{formatPercentage(res.calculatedMargin)}</span>
                                  </div>
                                  {isNegative && (
                                      <div className="flex items-center justify-center mt-2 text-red-800 font-black text-xs gap-1 animate-pulse">
                                          <AlertTriangle className="w-4 h-4" />
                                          <span>PREJUÍZO</span>
                                      </div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
                  {lockedMarginPlatforms.map(platform => <LockedPlatformCard key={platform} platform={platform} />)}
              </div>
              ) : (
                      <div className="text-center text-gray-500 py-12"><p>Preencha os campos e clique em "Simular Margem" para ver os resultados.</p></div>
              )}
          </ProFeatureWrapper>
      </Card>

      <ShopeeBatchConference settings={settings} accessLevel={accessLevel} />
      <VolumetricWeightCalculator accessLevel={accessLevel} />
    </>
  );
}
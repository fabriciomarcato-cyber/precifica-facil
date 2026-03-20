
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
    <div className="p-4 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50/50 h-full min-h-[450px]">
         {getMarketplaceIcon(platform, "w-10 h-10 opacity-30 grayscale")}
         <h3 className="text-sm font-bold text-gray-400 mt-3">
            {(platform === Platform.ML_CLASSICO || platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : platform}
         </h3>
         <div className="mt-6 text-center">
            <Lock className="w-6 h-6 text-gray-300 mx-auto" />
            <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-wider">Disponível no Plano Pro</p>
         </div>
    </div>
);

const FreebieBadge: React.FC = () => (
    <span className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold px-2 py-1 rounded-full bg-green-600 text-white z-10">
        Demonstração Gratuita
    </span>
);


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
    if (isNegative) return 'bg-red-50 border-red-400';
    
    switch (platform) {
        case Platform.ML_CLASSICO:
        case Platform.ML_PREMIUM:
            return 'bg-yellow-50 border-yellow-200';
        case Platform.SHOPEE:
            return 'bg-red-50 border-red-200';
        case Platform.TIKTOK_SHOP:
            return 'bg-gray-50 border-gray-200';
        case Platform.INSTAGRAM:
            return 'bg-blue-50 border-blue-200';
        default:
            return 'bg-slate-100 border-slate-200';
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
  
  const PRICE_CALC_DEMO_PLATFORM = Platform.SHOPEE;
  const activePricePlatforms = isRestricted ? [PRICE_CALC_DEMO_PLATFORM] : allPlatforms;
  const lockedPricePlatforms = isRestricted ? allPlatforms.filter(p => p !== PRICE_CALC_DEMO_PLATFORM) : [];
  const displayedPriceResults = priceResults.filter(r => activePricePlatforms.includes(r.platform));
  
  const INVERSE_CALC_DEMO_PLATFORM = Platform.TIKTOK_SHOP;
  const activeInversePlatforms = isRestricted ? [INVERSE_CALC_DEMO_PLATFORM] : allPlatforms;
  const lockedInversePlatforms = isRestricted ? allPlatforms.filter(p => p !== INVERSE_CALC_DEMO_PLATFORM) : [];
  const displayedInverseResults = inverseResults.filter(r => activeInversePlatforms.includes(r.platform));

  const MARGIN_SIM_DEMO_PLATFORM = Platform.INSTAGRAM;
  const activeMarginPlatforms = isRestricted ? [MARGIN_SIM_DEMO_PLATFORM] : allPlatforms;
  const lockedMarginPlatforms = isRestricted ? allPlatforms.filter(p => p !== MARGIN_SIM_DEMO_PLATFORM) : [];
  const displayedMarginResults = marginResults.filter(r => activeMarginPlatforms.includes(r.platform));

  return (
    <>
      <Card 
        title={isRestricted ? "Demonstrativo de Cálculo de Preço" : "Cálculo de Preço de Venda"}
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
                    const isNegative = res.grossProfit < 0;
                    const isDemo = isRestricted && res.platform === PRICE_CALC_DEMO_PLATFORM;
                    const colorClasses = getPlatformColor(res.platform, isNegative);
                    return (
                    <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${colorClasses} min-h-[450px] shadow-sm`}>
                        {isDemo && <FreebieBadge />}
                        
                        <div className="flex items-center gap-2 mb-4">
                            {getMarketplaceIcon(res.platform, "w-8 h-8")}
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-gray-800">
                                        {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                    </h3>
                                    { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                            {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                        </span>
                                    )}
                                </div>
                                {res.platform === Platform.SHOPEE && (
                                    <p className="text-[9px] text-gray-500 uppercase font-medium">Cálculo: {settings.shopee.sellerType}</p>
                                )}
                                {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                    <p className="text-[9px] text-gray-400 font-medium">Peso: {settings.mercadoLivre.productWeight}kg</p>
                                )}
                            </div>
                        </div>

                        <div className="text-center mb-6 py-2">
                            <p className="text-gray-500 text-[11px] font-medium mb-1">Preço mínimo de Venda</p>
                            <p className={`text-3xl font-black ${isNegative ? 'text-red-600' : 'text-blue-700'}`}>{formatCurrency(res.sellingPrice)}</p>
                        </div>

                        <div className="w-full space-y-2 flex-grow text-[11px]">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Custo do Produto</span>
                                <span className="font-bold text-gray-900">{formatCurrency(res.productCost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                <span className="font-bold text-gray-900">{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                <span className="font-bold text-gray-900">{formatCurrency(res.commission)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                <span className="font-bold text-gray-900">{formatCurrency(res.tax)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Taxa Fixa/Frete</span>
                                <span className="font-bold text-gray-900">{formatCurrency(res.fixedFee)}</span>
                            </div>
                        </div>

                        <div className={`w-full border-t mt-4 pt-3 space-y-1.5 ${isNegative ? 'border-red-200' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${isNegative ? 'text-red-700' : 'text-green-700'}`}>Lucro Bruto</span>
                                <span className={`text-sm font-black ${isNegative ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-800">Margem Final</span>
                                <span className="text-sm font-black text-blue-800">{formatPercentage(res.calculatedMargin)}</span>
                            </div>
                            {isNegative && (
                                <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-[10px] gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>PREJUÍZO</span>
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
          title={isRestricted ? "Demonstrativo de Cálculo Inverso" : "Cálculo Inverso - Qual Custo Comprar?"}
          subtitle="Defina o preço de venda e descubra o custo máximo de compra para manter sua margem de lucro."
      >
          <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="w-full sm:w-48">
                  <label htmlFor="desiredPrice" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Preço de Venda Desejado (R$):</label>
                  <input id="desiredPrice" type="number" value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value)} placeholder="120.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"/>
              </div>
              <button onClick={handleInverseCalculation} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-6 rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm">Calcular Custo Máximo</button>
          </div>
          {inverseCalcError && <p className="text-red-600 text-sm mt-2">{inverseCalcError}</p>}
          {inverseResults.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {displayedInverseResults.map((res) => {
                      const isNegative = res.maxProductCost && res.maxProductCost < 0;
                      const isDemo = isRestricted && res.platform === INVERSE_CALC_DEMO_PLATFORM;
                      const colorClasses = getPlatformColor(res.platform, !!isNegative);
                      return (
                          <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${colorClasses} min-h-[450px] shadow-sm`}>
                              {isDemo && <FreebieBadge />}
                              
                              <div className="flex items-center gap-2 mb-4">
                                  {getMarketplaceIcon(res.platform, "w-8 h-8")}
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                          <h3 className="text-sm font-bold text-gray-800">
                                              {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                          </h3>
                                          { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                                  {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                              </span>
                                          )}
                                      </div>
                                      {res.platform === Platform.SHOPEE && (
                                          <p className="text-[9px] text-gray-500 uppercase font-medium">Cálculo: {settings.shopee.sellerType}</p>
                                      )}
                                      {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                          <p className="text-[9px] text-gray-400 font-medium">Peso: {settings.mercadoLivre.productWeight}kg</p>
                                      )}
                                  </div>
                              </div>

                              <div className="text-center mb-6 py-2">
                                  <p className="text-gray-600 text-[11px] font-medium mb-1">Custo Máximo do Produto</p>
                                  <p className={`text-3xl font-black ${isNegative ? 'text-red-600' : 'text-blue-700'}`}>{formatCurrency(res.maxProductCost)}</p>
                              </div>

                              <div className="w-full space-y-2 flex-grow text-[11px]">
                                  <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Preço de Venda</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(res.sellingPrice)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(res.grossProfit)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(res.commission)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(res.tax)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Taxa Fixa/Frete</span>
                                      <span className="font-bold text-gray-900">{formatCurrency(res.fixedFee)}</span>
                                  </div>
                              </div>

                              <div className={`w-full border-t mt-4 pt-3 space-y-1.5 ${isNegative ? 'border-red-200' : 'border-gray-200'}`}>
                                  <div className="flex justify-between items-center">
                                      <span className={`text-xs font-bold ${isNegative ? 'text-red-700' : 'text-green-700'}`}>Margem Desejada</span>
                                      <span className={`text-sm font-black ${isNegative ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(res.grossProfit)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-blue-800">Margem Final</span>
                                      <span className="text-sm font-black text-blue-800">{formatPercentage(res.calculatedMargin)}</span>
                                  </div>
                                  {isNegative && (
                                      <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-[10px] gap-1">
                                          <AlertTriangle className="w-3 h-3" />
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
      </Card>

      <Card 
          title={isRestricted ? "Demonstrativo de Simulação de Margem" : "Simulação de Margem por Preço de Venda"}
          subtitle="Simule diferentes preços para ver automaticamente o lucro e a margem em cada canal."
      >
          <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="w-full sm:w-48">
                  <label htmlFor="simProductCost" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Custo Produto (R$):</label>
                  <input id="simProductCost" type="number" value={simProductCost} onChange={(e) => setSimProductCost(e.target.value)} placeholder="25.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"/>
              </div>
              <div className="w-full sm:w-48">
                  <label htmlFor="simSellingPrice" className="block text-xs font-bold text-gray-600 uppercase tracking-tight mb-1">Preço de Venda (R$):</label>
                  <input id="simSellingPrice" type="number" value={simSellingPrice} onChange={(e) => setSimSellingPrice(e.target.value)} placeholder="80.00" className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"/>
              </div>
              <button onClick={handleMarginSimulation} className="w-full sm:w-auto bg-green-600 text-white font-bold py-2 px-6 rounded-md hover:bg-green-700 transition-colors shadow-sm text-sm">Simular Margem</button>
          </div>
          {marginSimError && <p className="text-red-600 text-sm mt-2">{marginSimError}</p>}
          {marginResults.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {displayedMarginResults.map((res) => {
                  const isNegative = res.grossProfit < 0;
                  const isDemo = isRestricted && res.platform === MARGIN_SIM_DEMO_PLATFORM;
                  const colorClasses = getPlatformColor(res.platform, isNegative);
                  return (
                      <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${colorClasses} min-h-[450px] shadow-sm`}>
                          {isDemo && <FreebieBadge />}
                          
                          <div className="flex items-center gap-2 mb-4">
                              {getMarketplaceIcon(res.platform, "w-8 h-8")}
                              <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-bold text-gray-800">
                                          {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                      </h3>
                                      { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                              {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                          </span>
                                      )}
                                  </div>
                                  {res.platform === Platform.SHOPEE && (
                                      <p className="text-[9px] text-gray-500 uppercase font-medium">Cálculo: {settings.shopee.sellerType}</p>
                                  )}
                                  {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                      <p className="text-[9px] text-gray-400 font-medium">Peso: {settings.mercadoLivre.productWeight}kg</p>
                                  )}
                              </div>
                          </div>

                          <div className="text-center mb-6 py-2">
                              <p className="text-gray-600 text-[11px] font-medium mb-1">Lucro Bruto</p>
                              <p className={`text-3xl font-black ${isNegative ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(res.grossProfit)}</p>
                          </div>

                          <div className="w-full space-y-2 flex-grow text-[11px]">
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-500">Preço de Venda</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(res.sellingPrice)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-500">Custo do Produto</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(res.productCost)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-500">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(res.commission)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-500">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(res.tax)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-gray-500">Taxa Fixa/Frete</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(res.fixedFee)}</span>
                              </div>
                          </div>

                          <div className={`w-full border-t mt-4 pt-3 space-y-1.5 ${isNegative ? 'border-red-200' : 'border-gray-200'}`}>
                              <div className="flex justify-between items-center">
                                  <span className={`text-xs font-bold ${isNegative ? 'text-red-700' : 'text-green-700'}`}>Lucro Bruto</span>
                                  <span className={`text-sm font-black ${isNegative ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(res.grossProfit)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-blue-800">Margem Final</span>
                                  <span className="text-sm font-black text-blue-800">{formatPercentage(res.calculatedMargin)}</span>
                              </div>
                              {isNegative && (
                                  <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-[10px] gap-1">
                                      <AlertTriangle className="w-3 h-3" />
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
      </Card>

      <ShopeeBatchConference settings={settings} accessLevel={accessLevel} />
      <VolumetricWeightCalculator />
    </>
  );
}
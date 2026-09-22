
import React, { useState, useEffect } from 'react';
import { AppSettings, CalculationResult, Platform } from '../types';
import { 
    calculateIndividualPrices, 
    calculateMaxCost, 
    simulateMargin,
    calcularFreteShein,
    getSheinTierLabel,
    formatCurrency,
    formatPercentage,
    parseNumber,
    parseWeight
} from '../lib/calculator';
import { getMarketplaceIcon } from './MarketplaceIcons';
import { AlertTriangle, Info, Scale, Calculator, TrendingUp, CornerDownLeft } from 'lucide-react';

import ShopeeBatchConference from './ShopeeBatchConference';
import VolumetricWeightCalculator from './VolumetricWeightCalculator';

interface CalculatorSectionProps {
  settings: AppSettings;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
}


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
        case Platform.SHEIN:
            return 'bg-gradient-to-b from-neutral-900 to-black border-neutral-700 text-white';
        default:
            return 'bg-slate-100 border-slate-200 text-gray-900';
    }
};

export default function CalculatorSection({ settings, setSettings }: CalculatorSectionProps) {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('all');
  const [productCost, setProductCost] = useState('');
  const [desiredPrice, setDesiredPrice] = useState('');
  const [simProductCost, setSimProductCost] = useState('');
  const [simSellingPrice, setSimSellingPrice] = useState('');
  const [mlWeightInput, setMlWeightInput] = useState(() => 
    settings.mercadoLivre.productWeight ? String(settings.mercadoLivre.productWeight) : '1'
  );

  useEffect(() => {
    if (settings.mercadoLivre.productWeight) {
      setMlWeightInput(String(settings.mercadoLivre.productWeight));
    }
  }, [settings.mercadoLivre.productWeight]);

  const updateWeight = (val: string) => {
    setMlWeightInput(val);
    const parsed = parseWeight(val);
    if (parsed > 0 && setSettings) {
      setSettings(prev => ({
        ...prev,
        mercadoLivre: { ...prev.mercadoLivre, productWeight: parsed }
      }));
    }
  };

  const currentWeight = parseWeight(mlWeightInput || settings.mercadoLivre.productWeight);

  const [priceResults, setPriceResults] = useState<CalculationResult[]>([]);
  const [inverseResults, setInverseResults] = useState<CalculationResult[]>([]);
  const [marginResults, setMarginResults] = useState<CalculationResult[]>([]);
  
  const [priceCalcError, setPriceCalcError] = useState('');
  const [inverseCalcError, setInverseCalcError] = useState('');
  const [marginSimError, setMarginSimError] = useState('');

  useEffect(() => { priceResults.length > 0 && setPriceResults([]); priceCalcError && setPriceCalcError(''); }, [productCost, settings, mlWeightInput, selectedMarketplace]);
  useEffect(() => { inverseResults.length > 0 && setInverseResults([]); inverseCalcError && setInverseCalcError(''); }, [desiredPrice, settings, mlWeightInput, selectedMarketplace]);
  useEffect(() => { marginResults.length > 0 && setMarginResults([]); marginSimError && setMarginSimError(''); }, [simProductCost, simSellingPrice, settings, mlWeightInput, selectedMarketplace]);

  const handlePriceCalculation = () => {
    const cost = parseNumber(productCost);
    const weight = currentWeight;

    if (selectedMarketplace === Platform.SHEIN && (!weight || weight <= 0)) {
      setPriceCalcError('O peso do produto (em kg) é obrigatório para calcular na Shein.');
      setPriceResults([]);
      return;
    }

    if (cost > 0 && weight > 0) {
      setPriceCalcError('');
      setPriceResults(calculateIndividualPrices(cost, weight, settings));
    } else {
      setPriceCalcError('Insira um custo válido maior que zero e informe o peso.');
      setPriceResults([]);
    }
  };
  
  const handleInverseCalculation = () => {
    const price = parseNumber(desiredPrice);
    const weight = currentWeight;

    if (selectedMarketplace === Platform.SHEIN && (!weight || weight <= 0)) {
      setInverseCalcError('O peso do produto (em kg) é obrigatório para calcular na Shein.');
      setInverseResults([]);
      return;
    }

    if (price > 0 && weight > 0) {
      setInverseCalcError('');
      setInverseResults(calculateMaxCost(price, weight, settings));
    } else {
      setInverseCalcError('Insira um preço de venda válido maior que zero e informe o peso.');
      setInverseResults([]);
    }
  };

  const handleMarginSimulation = () => {
    const cost = parseNumber(simProductCost);
    const price = parseNumber(simSellingPrice);
    const weight = currentWeight;

    if (selectedMarketplace === Platform.SHEIN && (!weight || weight <= 0)) {
      setMarginSimError('O peso do produto (em kg) é obrigatório para calcular na Shein.');
      setMarginResults([]);
      return;
    }

    if (cost > 0 && price > 0 && weight > 0) {
      setMarginSimError('');
      setMarginResults(simulateMargin(cost, price, weight, settings));
    } else {
      setMarginSimError('Insira custo e preço válidos (maiores que zero) e informe o peso.');
      setMarginResults([]);
    }
  };
  
  const allPlatforms: Platform[] = [
    Platform.ML_CLASSICO, 
    Platform.ML_PREMIUM, 
    Platform.SHOPEE, 
    Platform.TIKTOK_SHOP, 
    Platform.INSTAGRAM,
    Platform.SHEIN,
  ];

  const filterPlatformResults = (results: CalculationResult[]) => {
    const list = results.filter(r => allPlatforms.includes(r.platform));
    if (selectedMarketplace === 'all') return list;
    if (selectedMarketplace === 'ML') {
      return list.filter(r => r.platform === Platform.ML_CLASSICO || r.platform === Platform.ML_PREMIUM);
    }
    return list.filter(r => r.platform === selectedMarketplace);
  };
  
  const displayedPriceResults = filterPlatformResults(priceResults);
  const displayedInverseResults = filterPlatformResults(inverseResults);
  const displayedMarginResults = filterPlatformResults(marginResults);

  const getResultsGridClass = (count: number) => {
    if (count === 1) return 'max-w-md mx-auto grid grid-cols-1';
    if (count === 2) return 'max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5';
    if (count <= 4) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5';
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 xl:gap-6';
  };

  const renderMarketplaceSelector = () => (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Canal de Venda:</span>
      {[
        { id: 'all', label: 'Todos os Marketplaces' },
        { id: Platform.SHEIN, label: 'Shein' },
        { id: 'ML', label: 'Mercado Livre' },
        { id: Platform.SHOPEE, label: 'Shopee' },
        { id: Platform.TIKTOK_SHOP, label: 'TikTok Shop' },
        { id: Platform.INSTAGRAM, label: 'Instagram' },
      ].map((item) => {
        const isSelected = selectedMarketplace === item.id;
        const isShein = item.id === Platform.SHEIN;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedMarketplace(item.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isSelected
                ? (isShein ? 'bg-black text-white shadow-md ring-2 ring-neutral-400' : 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300')
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isShein && <span className="bg-white text-black px-1 rounded text-[9px] font-black">SHEIN</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <Card 
        title="Cálculo de Preço de Venda"
        subtitle="Informe o custo do produto e veja o preço de venda ideal em cada canal."
      >
        {renderMarketplaceSelector()}

        {/* Input Bar */}
        <div className="bg-gray-50/80 p-4 sm:p-5 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <div>
              <label htmlFor="productCost" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Custo do Produto:
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <span className="text-gray-500 font-bold text-sm">R$</span>
                </div>
                <input
                  id="productCost"
                  type="text"
                  inputMode="decimal"
                  value={productCost}
                  onChange={(e) => setProductCost(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePriceCalculation();
                  }}
                  placeholder="0,00"
                  className="block w-full pl-10 pr-3 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Valor pago ao fornecedor ou custo produtivo
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="mlWeight" className="block text-xs font-bold text-gray-700 uppercase tracking-wider truncate">
                  {selectedMarketplace === Platform.SHEIN ? 'Peso Shein:' : (selectedMarketplace === 'all' ? 'Peso (ML e Shein):' : 'Peso ML:')}
                </label>
                {selectedMarketplace === Platform.SHEIN && (
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider shrink-0">* Obrigatório</span>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Scale className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="mlWeight"
                  type="text"
                  inputMode="decimal"
                  value={mlWeightInput}
                  onChange={(e) => updateWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePriceCalculation();
                  }}
                  placeholder="Ex: 0,350 ou 350g"
                  className="block w-full pl-9 pr-12 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-xs font-bold text-gray-400">kg/g</span>
                </div>
              </div>
              {(selectedMarketplace === 'all' || selectedMarketplace === Platform.SHEIN) ? (
                <div className="mt-1.5 text-[11px] text-gray-600 leading-tight">
                  <span className="font-semibold text-neutral-800">Frete Shein: </span>
                  <span className="font-black text-blue-700">{formatCurrency(calcularFreteShein(currentWeight))}</span>
                  <span className="text-[10px] text-gray-500 block truncate">{getSheinTierLabel(currentWeight)}</span>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                  Faixa de peso para cálculo de frete
                </p>
              )}
            </div>

            <div className="flex flex-col">
              <span className="hidden lg:block text-xs font-bold text-transparent select-none mb-1.5">
                Ação
              </span>
              <button
                onClick={handlePriceCalculation}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] text-sm"
              >
                <Calculator className="w-4 h-4 shrink-0" />
                <span>Calcular Preço</span>
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-blue-800/40 px-1.5 py-0.5 rounded text-blue-100">↵ Enter</kbd>
              </button>
              <p className="mt-1.5 text-[11px] text-gray-500 text-center sm:text-left flex items-center gap-1 justify-center sm:justify-start">
                <CornerDownLeft className="w-3 h-3 text-gray-400 shrink-0" /> Ou tecle Enter em qualquer campo
              </p>
            </div>
          </div>
        </div>

        {priceCalcError && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{priceCalcError}</span>
          </div>
        )}
        
        {priceResults.length > 0 ? (
            <div className={`mt-8 ${getResultsGridClass(displayedPriceResults.length)}`}>
                {displayedPriceResults.map((res) => {
                    const isNegative = res.grossProfit < 0;
                    const isDark = res.platform === Platform.SHOPEE || res.platform === Platform.SHEIN;
                    const colorClasses = getPlatformColor(res.platform, isNegative);
                    return (
                    <div key={res.platform} className={`relative p-5 sm:p-6 rounded-2xl border flex flex-col ${colorClasses} min-h-[460px] shadow-lg overflow-hidden transition-transform hover:scale-[1.01]`}>
                        <div className="mb-5 text-center">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                                        {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                    </h3>
                                    { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider shrink-0 ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                            {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                        </span>
                                    )}
                                </div>
                                {res.platform === Platform.SHOPEE && (
                                    <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">CÁLCULO: {settings.shopee.sellerType}</p>
                                )}
                                {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                    <p className="text-[10px] opacity-75 font-bold">Peso: {currentWeight}kg</p>
                                )}
                                {res.platform === Platform.SHEIN && (
                                    <div className="text-[10px] opacity-90 font-bold flex flex-col items-center">
                                        <span className="uppercase tracking-widest font-black text-white">Comissão Fixa: 18%</span>
                                        <span className="text-neutral-300 text-[10px]">Frete: {formatCurrency(res.fixedFee)} ({currentWeight}kg)</span>
                                    </div>
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

                        <div className="text-center mb-6 px-1">
                            <p className="opacity-70 text-xs sm:text-sm font-bold mb-1">Preço mínimo de Venda</p>
                            <p className={`text-3xl sm:text-4xl lg:text-[2.65rem] font-black tracking-tight leading-tight break-words ${isNegative ? 'text-red-700' : (isDark ? 'text-white' : 'text-[#2563EB]')}`}>
                                {formatCurrency(res.sellingPrice)}
                            </p>
                        </div>

                        <div className="w-full space-y-2.5 flex-grow text-xs sm:text-sm font-medium">
                            <div className="flex justify-between items-center gap-2">
                                <span className="opacity-75 truncate">Custo do Produto</span>
                                <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.productCost)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="opacity-75 truncate">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="opacity-75 truncate">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.commission)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="opacity-75 truncate">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.tax)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="opacity-75 truncate">{res.platform === Platform.SHEIN ? 'Frete Shein (por peso)' : 'Taxa Fixa/Frete'}</span>
                                <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.fixedFee)}</span>
                            </div>
                            {res.breakEvenPrice !== undefined && res.breakEvenPrice > 0 && (
                                <div className="flex justify-between items-center gap-2 pt-2 border-t border-dashed border-current/25">
                                    <span className="opacity-80 text-xs font-bold truncate">Ponto de Equilíbrio</span>
                                    <span className="font-black text-xs shrink-0 whitespace-nowrap">{formatCurrency(res.breakEvenPrice)}</span>
                                </div>
                            )}
                        </div>

                        <div className={`w-full border-t mt-5 pt-4 space-y-2.5 ${isNegative ? 'border-red-300' : 'border-black/10'}`}>
                            <div className="flex justify-between items-center gap-2">
                                <span className={`text-sm sm:text-base font-black shrink-0 ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#166534]')}`}>Lucro Bruto</span>
                                <span className={`text-base sm:text-xl font-black shrink-0 whitespace-nowrap ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className={`text-sm sm:text-base font-black shrink-0 ${isDark ? 'text-white' : 'text-[#2563EB]'}`}>Margem Final</span>
                                <span className={`text-base sm:text-xl font-black shrink-0 whitespace-nowrap ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#2563EB]')}`}>{formatPercentage(res.calculatedMargin)}</span>
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
            </div>
        ) : (
            <div className="text-center text-gray-500 py-12"><p className="text-lg">Digite o custo do produto e clique em "Calcular Preço de Venda".</p></div>
        )}
      </Card>

      <Card 
          title="Cálculo Inverso - Qual Custo Comprar?"
          subtitle="Defina o preço de venda e descubra o custo máximo de compra para manter sua margem de lucro."
      >
          {renderMarketplaceSelector()}

        {/* Input Bar */}
        <div className="bg-gray-50/80 p-4 sm:p-5 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <div>
              <label htmlFor="desiredPrice" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Preço de Venda Desejado:
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <span className="text-gray-500 font-bold text-sm">R$</span>
                </div>
                <input
                  id="desiredPrice"
                  type="text"
                  inputMode="decimal"
                  value={desiredPrice}
                  onChange={(e) => setDesiredPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInverseCalculation();
                  }}
                  placeholder="0,00"
                  className="block w-full pl-10 pr-3 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Preço final pretendido no marketplace
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="mlWeight2" className="block text-xs font-bold text-gray-700 uppercase tracking-wider truncate">
                  {selectedMarketplace === Platform.SHEIN ? 'Peso Shein:' : (selectedMarketplace === 'all' ? 'Peso (ML e Shein):' : 'Peso ML:')}
                </label>
                {selectedMarketplace === Platform.SHEIN && (
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider shrink-0">* Obrigatório</span>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Scale className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="mlWeight2"
                  type="text"
                  inputMode="decimal"
                  value={mlWeightInput}
                  onChange={(e) => updateWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInverseCalculation();
                  }}
                  placeholder="Ex: 0,900 ou 900g"
                  className="block w-full pl-9 pr-12 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-xs font-bold text-gray-400">kg/g</span>
                </div>
              </div>
              {(selectedMarketplace === 'all' || selectedMarketplace === Platform.SHEIN) ? (
                <div className="mt-1.5 text-[11px] text-gray-600 leading-tight">
                  <span className="font-semibold text-neutral-800">Frete Shein: </span>
                  <span className="font-black text-blue-700">{formatCurrency(calcularFreteShein(currentWeight))}</span>
                  <span className="text-[10px] text-gray-500 block truncate">{getSheinTierLabel(currentWeight)}</span>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                  Faixa de peso para cálculo de frete
                </p>
              )}
            </div>

            <div className="flex flex-col">
              <span className="hidden lg:block text-xs font-bold text-transparent select-none mb-1.5">
                Ação
              </span>
              <button
                onClick={handleInverseCalculation}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] text-sm"
              >
                <Calculator className="w-4 h-4 shrink-0" />
                <span>Calcular Custo Máximo</span>
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-blue-800/40 px-1.5 py-0.5 rounded text-blue-100">↵ Enter</kbd>
              </button>
              <p className="mt-1.5 text-[11px] text-gray-500 text-center sm:text-left flex items-center gap-1 justify-center sm:justify-start">
                <CornerDownLeft className="w-3 h-3 text-gray-400 shrink-0" /> Ou tecle Enter em qualquer campo
              </p>
            </div>
          </div>
        </div>

        {inverseCalcError && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{inverseCalcError}</span>
          </div>
        )}
          {inverseResults.length > 0 ? (
              <div className={`mt-8 ${getResultsGridClass(displayedInverseResults.length)}`}>
                  {displayedInverseResults.map((res) => {
                      const isNegative = res.maxProductCost && res.maxProductCost < 0;
                      const isDark = res.platform === Platform.SHOPEE || res.platform === Platform.SHEIN;
                      const colorClasses = getPlatformColor(res.platform, !!isNegative);
                      return (
                          <div key={res.platform} className={`relative p-5 sm:p-6 rounded-2xl border flex flex-col ${colorClasses} min-h-[460px] shadow-lg overflow-hidden transition-transform hover:scale-[1.01]`}>
                              <div className="mb-5 text-center">
                                      <div className="flex flex-col items-center">
                                          <div className="flex items-center justify-center gap-2 mb-1">
                                              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                                                  {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                              </h3>
                                              { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider shrink-0 ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                                      {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                                  </span>
                                              )}
                                          </div>
                                          {res.platform === Platform.SHOPEE && (
                                              <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">CÁLCULO: {settings.shopee.sellerType}</p>
                                          )}
                                          {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                              <p className="text-[10px] opacity-75 font-bold">Peso: {currentWeight}kg</p>
                                          )}
                                          {res.platform === Platform.SHEIN && (
                                              <div className="text-[10px] opacity-90 font-bold flex flex-col items-center">
                                                  <span className="uppercase tracking-widest font-black text-white">Comissão Fixa: 18%</span>
                                                  <span className="text-neutral-300 text-[10px]">Frete: {formatCurrency(res.fixedFee)} ({currentWeight}kg)</span>
                                              </div>
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

                                  <div className="text-center mb-6 px-1">
                                      <p className="opacity-70 text-xs sm:text-sm font-bold mb-1">Custo Máximo do Produto</p>
                                      <p className={`text-3xl sm:text-4xl lg:text-[2.65rem] font-black tracking-tight leading-tight break-words ${isNegative ? 'text-red-700' : (isDark ? 'text-white' : 'text-[#2563EB]')}`}>
                                          {formatCurrency(res.maxProductCost)}
                                      </p>
                                  </div>

                                  <div className="w-full space-y-2.5 flex-grow text-xs sm:text-sm font-medium">
                                      <div className="flex justify-between items-center gap-2">
                                          <span className="opacity-75 truncate">Preço de Venda</span>
                                          <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.sellingPrice)}</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                          <span className="opacity-75 truncate">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                          <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.grossProfit)}</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                          <span className="opacity-75 truncate">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                          <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.commission)}</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                          <span className="opacity-75 truncate">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                          <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.tax)}</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                          <span className="opacity-75 truncate">{res.platform === Platform.SHEIN ? 'Frete Shein (por peso)' : 'Taxa Fixa/Frete'}</span>
                                          <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.fixedFee)}</span>
                                      </div>
                                      {res.breakEvenPrice !== undefined && res.breakEvenPrice > 0 && (
                                          <div className="flex justify-between items-center gap-2 pt-2 border-t border-dashed border-current/25">
                                              <span className="opacity-80 text-xs font-bold truncate">Ponto de Equilíbrio</span>
                                              <span className="font-black text-xs shrink-0 whitespace-nowrap">{formatCurrency(res.breakEvenPrice)}</span>
                                          </div>
                                      )}
                                  </div>

                                  <div className={`w-full border-t mt-5 pt-4 space-y-2.5 ${isNegative ? 'border-red-300' : 'border-black/10'}`}>
                                      <div className="flex justify-between items-center gap-2">
                                          <span className={`text-sm sm:text-base font-black shrink-0 ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#166534]')}`}>Margem Desejada</span>
                                          <span className={`text-base sm:text-xl font-black shrink-0 whitespace-nowrap ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-2">
                                          <span className={`text-sm sm:text-base font-black shrink-0 ${isDark ? 'text-white' : 'text-[#2563EB]'}`}>Margem Final</span>
                                          <span className={`text-base sm:text-xl font-black shrink-0 whitespace-nowrap ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#2563EB]')}`}>{formatPercentage(res.calculatedMargin)}</span>
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
                  </div>
              ) : (
                  <div className="text-center text-gray-500 py-12"><p>Digite o preço de venda e clique em "Calcular Custo Máximo".</p></div>
              )}
      </Card>

      <Card 
          title="Simulação de Margem por Preço de Venda"
          subtitle="Simule diferentes preços para ver automaticamente o lucro e a margem em cada canal."
      >
          {renderMarketplaceSelector()}

        {/* Input Bar */}
        <div className="bg-gray-50/80 p-4 sm:p-5 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div>
              <label htmlFor="simProductCost" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Custo do Produto:
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <span className="text-gray-500 font-bold text-sm">R$</span>
                </div>
                <input
                  id="simProductCost"
                  type="text"
                  inputMode="decimal"
                  value={simProductCost}
                  onChange={(e) => setSimProductCost(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleMarginSimulation();
                  }}
                  placeholder="0,00"
                  className="block w-full pl-10 pr-3 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Custo de aquisição do produto
              </p>
            </div>

            <div>
              <label htmlFor="simSellingPrice" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Preço de Venda:
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <span className="text-gray-500 font-bold text-sm">R$</span>
                </div>
                <input
                  id="simSellingPrice"
                  type="text"
                  inputMode="decimal"
                  value={simSellingPrice}
                  onChange={(e) => setSimSellingPrice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleMarginSimulation();
                  }}
                  placeholder="0,00"
                  className="block w-full pl-10 pr-3 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Preço a testar no marketplace
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="simWeight" className="block text-xs font-bold text-gray-700 uppercase tracking-wider truncate">
                  {selectedMarketplace === Platform.SHEIN ? 'Peso Shein:' : (selectedMarketplace === 'all' ? 'Peso (ML e Shein):' : 'Peso ML:')}
                </label>
                {selectedMarketplace === Platform.SHEIN && (
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-wider shrink-0">* Obrigatório</span>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Scale className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="simWeight"
                  type="text"
                  inputMode="decimal"
                  value={mlWeightInput}
                  onChange={(e) => updateWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleMarginSimulation();
                  }}
                  placeholder="Ex: 0,900 ou 900g"
                  className="block w-full pl-9 pr-12 h-11 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-base shadow-sm hover:border-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-xs font-bold text-gray-400">kg/g</span>
                </div>
              </div>
              {(selectedMarketplace === 'all' || selectedMarketplace === Platform.SHEIN) ? (
                <div className="mt-1.5 text-[11px] text-gray-600 leading-tight">
                  <span className="font-semibold text-neutral-800">Frete Shein: </span>
                  <span className="font-black text-blue-700">{formatCurrency(calcularFreteShein(currentWeight))}</span>
                  <span className="text-[10px] text-gray-500 block truncate">{getSheinTierLabel(currentWeight)}</span>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                  Faixa de peso para cálculo de frete
                </p>
              )}
            </div>

            <div className="flex flex-col">
              <span className="hidden lg:block text-xs font-bold text-transparent select-none mb-1.5">
                Ação
              </span>
              <button
                onClick={handleMarginSimulation}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-bold px-5 rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-[0.99] text-sm"
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Simular Margem</span>
                <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-green-800/40 px-1.5 py-0.5 rounded text-green-100">↵ Enter</kbd>
              </button>
              <p className="mt-1.5 text-[11px] text-gray-500 text-center sm:text-left flex items-center gap-1 justify-center sm:justify-start">
                <CornerDownLeft className="w-3 h-3 text-gray-400 shrink-0" /> Ou tecle Enter em qualquer campo
              </p>
            </div>
          </div>
        </div>

        {marginSimError && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{marginSimError}</span>
          </div>
        )}
          {marginResults.length > 0 ? (
          <div className={`mt-8 ${getResultsGridClass(displayedMarginResults.length)}`}>
              {displayedMarginResults.map((res) => {
                  const isNegative = res.grossProfit < 0;
                  const isDark = res.platform === Platform.SHOPEE || res.platform === Platform.SHEIN;
                  const colorClasses = getPlatformColor(res.platform, isNegative);
                  return (
                      <div key={res.platform} className={`relative p-5 sm:p-6 rounded-2xl border flex flex-col ${colorClasses} min-h-[460px] shadow-lg overflow-hidden transition-transform hover:scale-[1.01]`}>
                          <div className="mb-5 text-center">
                              <div className="flex flex-col items-center">
                                  <div className="flex items-center justify-center gap-2 mb-1">
                                      <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                                          {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                      </h3>
                                      { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-wider shrink-0 ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                              {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                          </span>
                                      )}
                                  </div>
                                  {res.platform === Platform.SHOPEE && (
                                      <p className="text-[10px] opacity-70 uppercase font-black tracking-widest">CÁLCULO: {settings.shopee.sellerType}</p>
                                  )}
                                  {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                      <p className="text-[10px] opacity-75 font-bold">Peso: {currentWeight}kg</p>
                                  )}
                                  {res.platform === Platform.SHEIN && (
                                      <div className="text-[10px] opacity-90 font-bold flex flex-col items-center">
                                          <span className="uppercase tracking-widest font-black text-white">Comissão Fixa: 18%</span>
                                          <span className="text-neutral-300 text-[10px]">Frete: {formatCurrency(res.fixedFee)} ({currentWeight}kg)</span>
                                      </div>
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

                          <div className="text-center mb-6 px-1">
                              <p className="opacity-70 text-xs sm:text-sm font-bold mb-1">Lucro Bruto Simulado</p>
                              <p className={`text-3xl sm:text-4xl lg:text-[2.65rem] font-black tracking-tight leading-tight break-words ${isNegative ? 'text-red-700' : (isDark ? 'text-white' : 'text-[#166534]')}`}>
                                  {formatCurrency(res.grossProfit)}
                              </p>
                          </div>

                          <div className="w-full space-y-2.5 flex-grow text-xs sm:text-sm font-medium">
                              <div className="flex justify-between items-center gap-2">
                                  <span className="opacity-75 truncate">Preço de Venda</span>
                                  <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.sellingPrice)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                  <span className="opacity-75 truncate">Custo do Produto</span>
                                  <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.productCost)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                  <span className="opacity-75 truncate">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                  <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.commission)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                  <span className="opacity-75 truncate">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                  <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.tax)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                  <span className="opacity-75 truncate">{res.platform === Platform.SHEIN ? 'Frete Shein (por peso)' : 'Taxa Fixa/Frete'}</span>
                                  <span className="font-black shrink-0 whitespace-nowrap">{formatCurrency(res.fixedFee)}</span>
                              </div>
                              {res.breakEvenPrice !== undefined && res.breakEvenPrice > 0 && (
                                  <div className="flex justify-between items-center gap-2 pt-2 border-t border-dashed border-current/25">
                                      <span className="opacity-80 text-xs font-bold truncate">Ponto de Equilíbrio</span>
                                      <span className="font-black text-xs shrink-0 whitespace-nowrap">{formatCurrency(res.breakEvenPrice)}</span>
                                  </div>
                              )}
                          </div>

                          <div className={`w-full border-t mt-5 pt-4 space-y-2.5 ${isNegative ? 'border-red-300' : 'border-black/10'}`}>
                              <div className="flex justify-between items-center gap-2">
                                  <span className={`text-sm sm:text-base font-black shrink-0 ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#166534]')}`}>Lucro Bruto</span>
                                  <span className={`text-base sm:text-xl font-black shrink-0 whitespace-nowrap ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#166534]')}`}>{formatCurrency(res.grossProfit)}</span>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                  <span className={`text-sm sm:text-base font-black shrink-0 ${isDark ? 'text-white' : 'text-[#2563EB]'}`}>Margem Final</span>
                                  <span className={`text-base sm:text-xl font-black shrink-0 whitespace-nowrap ${isNegative ? 'text-red-800' : (isDark ? 'text-white' : 'text-[#2563EB]')}`}>{formatPercentage(res.calculatedMargin)}</span>
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
          </div>
          ) : (
                  <div className="text-center text-gray-500 py-12"><p>Preencha os campos e clique em "Simular Margem" para ver os resultados.</p></div>
          )}
      </Card>

      <ShopeeBatchConference settings={settings} />
      <VolumetricWeightCalculator />
    </>
  );
}
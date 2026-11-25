
import React, { useState, useEffect } from 'react';
import { AppSettings, CalculationResult, Platform } from '../types';
import { 
    calculateIndividualPrices, 
    calculateMaxCost, 
    simulateMargin,
    calcularFreteShein,
    getSheinTierLabel,
    formatCurrency,
    parseNumber,
    parseWeight
} from '../lib/calculator';
import { AlertTriangle, Scale, Calculator, TrendingUp, CornerDownLeft } from 'lucide-react';

import ResultsComparisonTable from './ResultsComparisonTable';
import BatchConference from './BatchConference';

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

export default function CalculatorSection({ settings, setSettings }: CalculatorSectionProps) {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('all');
  const [productCost, setProductCost] = useState('');
  const [desiredPrice, setDesiredPrice] = useState('');
  const [simProductCost, setSimProductCost] = useState('');
  const [simSellingPrice, setSimSellingPrice] = useState('');
  const [mlWeightInput, setMlWeightInput] = useState<string>(() =>
    settings.mercadoLivre.productWeight && settings.mercadoLivre.productWeight >= 0.001
      ? String(settings.mercadoLivre.productWeight).replace('.', ',')
      : ''
  );

  const updateWeight = (val: string) => {
    // Mantém o estado visual exatamente como string durante a digitação
    // sem forçar fallbacks prematuros (ex: 1) quando o usuário apaga ou digita "0,"
    setMlWeightInput(val);
  };

  const currentWeight = parseWeight(mlWeightInput);

  const [priceResults, setPriceResults] = useState<CalculationResult[]>([]);
  const [inverseResults, setInverseResults] = useState<CalculationResult[]>([]);
  const [marginResults, setMarginResults] = useState<CalculationResult[]>([]);
  
  const [priceCalcError, setPriceCalcError] = useState('');
  const [inverseCalcError, setInverseCalcError] = useState('');
  const [marginSimError, setMarginSimError] = useState('');

  useEffect(() => {
    priceResults.length > 0 && setPriceResults([]);
    priceCalcError && setPriceCalcError('');
  }, [
    productCost,
    mlWeightInput,
    selectedMarketplace,
    settings.simplesNacional,
    settings.mercadoLivre.contributionMargin,
    settings.mercadoLivre.classicCommission,
    settings.mercadoLivre.premiumCommission,
    settings.shopee,
    settings.tiktok,
    settings.instagram,
    settings.shein,
  ]);

  useEffect(() => {
    inverseResults.length > 0 && setInverseResults([]);
    inverseCalcError && setInverseCalcError('');
  }, [
    desiredPrice,
    mlWeightInput,
    selectedMarketplace,
    settings.simplesNacional,
    settings.mercadoLivre.contributionMargin,
    settings.mercadoLivre.classicCommission,
    settings.mercadoLivre.premiumCommission,
    settings.shopee,
    settings.tiktok,
    settings.instagram,
    settings.shein,
  ]);

  useEffect(() => {
    marginResults.length > 0 && setMarginResults([]);
    marginSimError && setMarginSimError('');
  }, [
    simProductCost,
    simSellingPrice,
    mlWeightInput,
    selectedMarketplace,
    settings.simplesNacional,
    settings.mercadoLivre.contributionMargin,
    settings.mercadoLivre.classicCommission,
    settings.mercadoLivre.premiumCommission,
    settings.shopee,
    settings.tiktok,
    settings.instagram,
    settings.shein,
  ]);

  const persistValidWeight = (weight: number) => {
    if (setSettings && weight >= 0.001 && settings.mercadoLivre.productWeight !== weight) {
      setSettings(prev => ({
        ...prev,
        mercadoLivre: { ...prev.mercadoLivre, productWeight: weight }
      }));
    }
  };

  const handlePriceCalculation = () => {
    const cost = parseNumber(productCost);
    const weight = parseWeight(mlWeightInput);

    if (!weight || weight < 0.001) {
      setPriceCalcError(
        selectedMarketplace === Platform.SHEIN
          ? 'O peso do produto (mínimo 0,001 kg / 1g) é obrigatório para calcular na Shein.'
          : 'Informe um peso válido de no mínimo 0,001 kg (1 grama).'
      );
      setPriceResults([]);
      return;
    }

    if (cost > 0) {
      setPriceCalcError('');
      persistValidWeight(weight);
      setPriceResults(calculateIndividualPrices(cost, weight, settings));
    } else {
      setPriceCalcError('Insira um custo válido maior que zero.');
      setPriceResults([]);
    }
  };
  
  const handleInverseCalculation = () => {
    const price = parseNumber(desiredPrice);
    const weight = parseWeight(mlWeightInput);

    if (!weight || weight < 0.001) {
      setInverseCalcError(
        selectedMarketplace === Platform.SHEIN
          ? 'O peso do produto (mínimo 0,001 kg / 1g) é obrigatório para calcular na Shein.'
          : 'Informe um peso válido de no mínimo 0,001 kg (1 grama).'
      );
      setInverseResults([]);
      return;
    }

    if (price > 0) {
      setInverseCalcError('');
      persistValidWeight(weight);
      setInverseResults(calculateMaxCost(price, weight, settings));
    } else {
      setInverseCalcError('Insira um preço de venda válido maior que zero.');
      setInverseResults([]);
    }
  };

  const handleMarginSimulation = () => {
    const cost = parseNumber(simProductCost);
    const price = parseNumber(simSellingPrice);
    const weight = parseWeight(mlWeightInput);

    if (!weight || weight < 0.001) {
      setMarginSimError(
        selectedMarketplace === Platform.SHEIN
          ? 'O peso do produto (mínimo 0,001 kg / 1g) é obrigatório para calcular na Shein.'
          : 'Informe um peso válido de no mínimo 0,001 kg (1 grama).'
      );
      setMarginResults([]);
      return;
    }

    if (cost > 0 && price > 0) {
      setMarginSimError('');
      persistValidWeight(weight);
      setMarginResults(simulateMargin(cost, price, weight, settings));
    } else {
      setMarginSimError('Insira custo e preço válidos (maiores que zero).');
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
          <ResultsComparisonTable
            results={displayedPriceResults}
            mode="price"
            settings={settings}
            currentWeight={currentWeight}
          />
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
            <ResultsComparisonTable
              results={displayedInverseResults}
              mode="inverse"
              settings={settings}
              currentWeight={currentWeight}
            />
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
            <ResultsComparisonTable
              results={displayedMarginResults}
              mode="margin"
              settings={settings}
              currentWeight={currentWeight}
            />
          ) : (
                  <div className="text-center text-gray-500 py-12"><p>Preencha os campos e clique em "Simular Margem" para ver os resultados.</p></div>
          )}
      </Card>

      <BatchConference settings={settings} />
    </>
  );
}
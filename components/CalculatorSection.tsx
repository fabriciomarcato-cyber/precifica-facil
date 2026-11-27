
import React, { useState, useEffect } from 'react';
import { AppSettings, CalculationResult, Platform } from '../types';
import { 
    calculateIndividualPrices, 
    calculateMaxCost, 
    simulateMargin,
    parseNumber,
    parseWeight
} from '../lib/calculator';
import { AlertTriangle, Scale, Calculator, TrendingUp, CornerDownLeft, Check } from 'lucide-react';

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

type ChannelFilterId =
  | Platform.SHEIN
  | 'ML'
  | Platform.SHOPEE
  | Platform.TIKTOK_SHOP
  | Platform.INSTAGRAM;

const ALL_CHANNEL_IDS: ChannelFilterId[] = [
  'ML',
  Platform.SHOPEE,
  Platform.TIKTOK_SHOP,
  Platform.SHEIN,
  Platform.INSTAGRAM,
];

export default function CalculatorSection({ settings, setSettings }: CalculatorSectionProps) {
  const [selectedChannels, setSelectedChannels] = useState<ChannelFilterId[]>(ALL_CHANNEL_IDS);
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

  const isAllSelected = ALL_CHANNEL_IDS.every((id) => selectedChannels.includes(id));
  const hasSheinSelected = selectedChannels.includes(Platform.SHEIN);
  const hasMLSelected = selectedChannels.includes('ML');
  const isOnlyShein = selectedChannels.length === 1 && hasSheinSelected;
  const requiresWeight = hasMLSelected || hasSheinSelected;

  useEffect(() => {
    priceResults.length > 0 && setPriceResults([]);
    priceCalcError && setPriceCalcError('');
  }, [
    productCost,
    mlWeightInput,
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
    setPriceCalcError('');
    setInverseCalcError('');
    setMarginSimError('');
  }, [selectedChannels]);

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
    const parsedWeight = parseWeight(mlWeightInput);

    if (requiresWeight && (!parsedWeight || parsedWeight < 0.001)) {
      setPriceCalcError(
        isOnlyShein
          ? 'O peso do produto (mínimo 0,001 kg / 1g) é obrigatório para calcular na Shein.'
          : 'Informe um peso válido de no mínimo 0,001 kg (1 grama).'
      );
      setPriceResults([]);
      return;
    }

    const weight = parsedWeight >= 0.001 ? parsedWeight : 0.5;

    if (cost > 0) {
      setPriceCalcError('');
      if (parsedWeight >= 0.001) persistValidWeight(parsedWeight);
      setPriceResults(calculateIndividualPrices(cost, weight, settings));
    } else {
      setPriceCalcError('Insira um custo válido maior que zero.');
      setPriceResults([]);
    }
  };
  
  const handleInverseCalculation = () => {
    const price = parseNumber(desiredPrice);
    const parsedWeight = parseWeight(mlWeightInput);

    if (requiresWeight && (!parsedWeight || parsedWeight < 0.001)) {
      setInverseCalcError(
        isOnlyShein
          ? 'O peso do produto (mínimo 0,001 kg / 1g) é obrigatório para calcular na Shein.'
          : 'Informe um peso válido de no mínimo 0,001 kg (1 grama).'
      );
      setInverseResults([]);
      return;
    }

    const weight = parsedWeight >= 0.001 ? parsedWeight : 0.5;

    if (price > 0) {
      setInverseCalcError('');
      if (parsedWeight >= 0.001) persistValidWeight(parsedWeight);
      setInverseResults(calculateMaxCost(price, weight, settings));
    } else {
      setInverseCalcError('Insira um preço de venda válido maior que zero.');
      setInverseResults([]);
    }
  };

  const handleMarginSimulation = () => {
    const cost = parseNumber(simProductCost);
    const price = parseNumber(simSellingPrice);
    const parsedWeight = parseWeight(mlWeightInput);

    if (requiresWeight && (!parsedWeight || parsedWeight < 0.001)) {
      setMarginSimError(
        isOnlyShein
          ? 'O peso do produto (mínimo 0,001 kg / 1g) é obrigatório para calcular na Shein.'
          : 'Informe um peso válido de no mínimo 0,001 kg (1 grama).'
      );
      setMarginResults([]);
      return;
    }

    const weight = parsedWeight >= 0.001 ? parsedWeight : 0.5;

    if (cost > 0 && price > 0) {
      setMarginSimError('');
      if (parsedWeight >= 0.001) persistValidWeight(parsedWeight);
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
    if (isAllSelected) return list;
    return list.filter((r) => {
      if (r.platform === Platform.ML_CLASSICO || r.platform === Platform.ML_PREMIUM) {
        return selectedChannels.includes('ML');
      }
      return selectedChannels.includes(r.platform as ChannelFilterId);
    });
  };
  
  const displayedPriceResults = filterPlatformResults(priceResults);
  const displayedInverseResults = filterPlatformResults(inverseResults);
  const displayedMarginResults = filterPlatformResults(marginResults);

  const handleSelectAllChannels = () => {
    setSelectedChannels(ALL_CHANNEL_IDS);
  };

  const handleToggleChannel = (channelId: ChannelFilterId) => {
    setSelectedChannels((prev) => {
      const allActive = ALL_CHANNEL_IDS.every((id) => prev.includes(id));
      if (allActive) {
        return [channelId];
      }
      if (prev.includes(channelId)) {
        const next = prev.filter((id) => id !== channelId);
        return next.length === 0 ? ALL_CHANNEL_IDS : next;
      }
      return [...prev, channelId];
    });
  };

  const weightFieldLabel = 'Peso:';

  const channelButtonStyles: Record<
    ChannelFilterId,
    { active: string; inactiveDot: string }
  > = {
    ML: {
      active: 'bg-[#FFE600] text-[#111827] border-[#CA8A04] shadow-md ring-2 ring-[#FFE600]/60',
      inactiveDot: 'bg-[#FFE600] ring-1 ring-[#CA8A04]/50',
    },
    [Platform.SHOPEE]: {
      active: 'bg-[#EE4D2D] text-[#FFFFFF] border-[#C83B1F] shadow-md ring-2 ring-[#EE4D2D]/40',
      inactiveDot: 'bg-[#EE4D2D]',
    },
    [Platform.TIKTOK_SHOP]: {
      active: 'bg-[#010101] text-[#FFFFFF] border-[#FE2C55] shadow-md ring-2 ring-[#25F4EE]/70',
      inactiveDot: 'bg-[#010101] ring-1 ring-[#FE2C55]',
    },
    [Platform.SHEIN]: {
      active: 'bg-[#111111] text-[#FFFFFF] border-[#374151] shadow-md ring-2 ring-[#374151]/60',
      inactiveDot: 'bg-[#111111] ring-1 ring-[#374151]/50',
    },
    [Platform.INSTAGRAM]: {
      active:
        'bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)] text-[#FFFFFF] border-[#DD2A7B] shadow-md ring-2 ring-[#DD2A7B]/40',
      inactiveDot: 'bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)]',
    },
  };

  const renderMarketplaceSelector = () => (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Canal de Venda:</span>
      <button
        type="button"
        aria-pressed={isAllSelected}
        onClick={handleSelectAllChannels}
        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
          isAllSelected
            ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`}
      >
        Todos os Marketplaces
      </button>
      {([
        { id: 'ML', label: 'Mercado Livre' },
        { id: Platform.SHOPEE, label: 'Shopee' },
        { id: Platform.TIKTOK_SHOP, label: 'TikTok Shop' },
        { id: Platform.SHEIN, label: 'Shein' },
        { id: Platform.INSTAGRAM, label: 'Instagram' },
      ] as Array<{ id: ChannelFilterId; label: string }>).map((item) => {
        const isSelected = !isAllSelected && selectedChannels.includes(item.id);
        const brandStyle = channelButtonStyles[item.id];
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleToggleChannel(item.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isSelected
                ? brandStyle.active
                : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {isSelected ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${brandStyle.inactiveDot}`} />
            )}
            {item.label}
          </button>
        );
      })}
      <span className="ml-auto text-[11px] font-medium text-gray-500">
        {isAllSelected
          ? 'Todos os canais ativos'
          : `${selectedChannels.length} ${selectedChannels.length === 1 ? 'canal selecionado' : 'canais selecionados'}`}
      </span>
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
                  {weightFieldLabel}
                </label>
                {isOnlyShein && (
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
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Faixa de peso para cálculo de frete
              </p>
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
                  {weightFieldLabel}
                </label>
                {isOnlyShein && (
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
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Faixa de peso para cálculo de frete
              </p>
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
                  {weightFieldLabel}
                </label>
                {isOnlyShein && (
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
              <p className="mt-1.5 text-[11px] text-gray-500 truncate">
                Faixa de peso para cálculo de frete
              </p>
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

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
import { Lock, AlertTriangle, KeyRound } from 'lucide-react';

interface CalculatorSectionProps {
  settings: AppSettings;
  accessLevel: 'restricted' | 'full';
  activate: (code: string) => Promise<{ success: boolean; message?: string }>;
  expiration: number | null;
  accessMessage: string;
  revalidateAccess: () => boolean;
}

const ActivationBar: React.FC<{
  activate: (code: string) => Promise<{ success: boolean; message?: string }>;
  accessMessage: string;
}> = ({ activate, accessMessage }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await activate(code);
        if (!result.success) {
            setError(result.message || 'Ocorreu um erro.');
        }
        setLoading(false);
    };
    
    return (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                    <KeyRound className="w-5 h-5" />
                    <span>Acesso limitado. Use um código para liberar tudo.</span>
                </div>
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Insira seu código"
                        className="rounded-md border-gray-300 shadow-sm sm:text-sm p-2 bg-white text-gray-900 w-48"
                        aria-label="Código de Acesso"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 text-sm"
                    >
                        {loading ? '...' : 'Ativar'}
                    </button>
                </form>
            </div>
             <div className="mt-2 text-sm h-5">
                 {error && <p className="text-red-600">{error}</p>}
                 {accessMessage && <p className="text-yellow-800">{accessMessage}</p>}
            </div>
        </div>
    );
};

const LockedPlatformCard: React.FC<{ platform: Platform }> = ({ platform }) => (
    <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 h-full min-h-[300px]">
         {getMarketplaceIcon(platform)}
         <h3 className="text-base font-bold text-gray-500 mt-2">
            {(platform === Platform.ML_CLASSICO || platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : platform}
         </h3>
         <div className="mt-4 text-center">
            <Lock className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Disponível no plano completo.</p>
         </div>
    </div>
);

const FreebieBadge: React.FC = () => (
    <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full bg-green-600 text-white z-10">
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
  
  useEffect(() => { priceResults.length > 0 && setPriceResults([]); priceCalcError && setPriceCalcError(''); }, [productCost]);
  useEffect(() => { inverseResults.length > 0 && setInverseResults([]); inverseCalcError && setInverseCalcError(''); }, [desiredPrice]);
  useEffect(() => { marginResults.length > 0 && setMarginResults([]); marginSimError && setMarginSimError(''); }, [simProductCost, simSellingPrice]);

  
  const handlePriceCalculation = () => {
    revalidateAccess();
    const cost = parseFloat(productCost);
    if (!isNaN(cost) && cost > 0) {
      setPriceCalcError('');
      setPriceResults(calculateIndividualPrices(cost, settings));
    } else {
      setPriceCalcError('Por favor, insira um custo de produto válido.');
      setPriceResults([]);
    }
  };
  
  const handleInverseCalculation = () => {
    revalidateAccess();
    const price = parseFloat(desiredPrice);
    if (!isNaN(price) && price > 0) {
      setInverseCalcError('');
      setInverseResults(calculateMaxCost(price, settings));
    } else {
      setInverseCalcError('Por favor, insira um preço de venda desejado válido.');
      setInverseResults([]);
    }
  };

  const handleMarginSimulation = () => {
    revalidateAccess();
    const cost = parseFloat(simProductCost);
    const price = parseFloat(simSellingPrice);
    if (!isNaN(cost) && !isNaN(price) && cost > 0 && price > 0) {
      setMarginSimError('');
      setMarginResults(simulateMargin(cost, price, settings));
    } else {
      setMarginSimError('Por favor, insira valores válidos para custo e preço de venda.');
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
      {isRestricted ? (
          <ActivationBar activate={activate} accessMessage={accessMessage} />
      ) : (
          expiration && (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r-lg" role="alert">
                  <p className="font-bold">Acesso completo ativado!</p>
                  <p>Todos os recursos estão disponíveis até {new Date(expiration).toLocaleString('pt-BR')}.</p>
              </div>
          )
      )}

      <Card 
        title={isRestricted ? "Demonstrativo de Cálculo de Preço" : "Cálculo de Preço de Venda"}
        subtitle="Informe o custo do produto e veja o preço de venda ideal, já considerando comissões, impostos e taxas."
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto">
                <label htmlFor="productCost" className="block text-sm font-medium text-gray-700">Custo do Produto (R$):</label>
                <input
                    id="productCost"
                    type="number"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    placeholder="Ex: 25.00"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"
                />
            </div>
            <button
                onClick={handlePriceCalculation}
                className="w-full sm:w-auto mt-2 sm:mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
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
                    return (
                    <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                        {isDemo && <FreebieBadge />}
                        { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                            <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                            </span>
                        )}
                        <div className={`flex items-center gap-2 mb-2 ${isDemo ? 'mt-5' : ''} ${ (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'justify-start' : 'justify-center' }`}>
                           {getMarketplaceIcon(res.platform)}
                           <h3 className="text-base font-bold text-gray-800">
                             {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                           </h3>
                        </div>
                        <p className="text-gray-600 text-sm text-center">Preço mínimo de Venda</p>
                        <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(res.sellingPrice)}</p>
                        <div className="text-sm space-y-2 flex-grow">
                            <div className="flex justify-between"><span className="text-gray-600">Custo do Produto</span><span className="font-medium text-gray-900">{formatCurrency(res.productCost)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Margem ({formatPercentage(res.contributionMarginPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.grossProfit)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Comissão ({formatPercentage(res.commissionPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.commission)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Simples Nacional ({formatPercentage(res.taxPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.tax)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Taxa Fixa/Frete</span><span className="font-medium text-gray-900">{formatCurrency(res.fixedFee)}</span></div>
                        </div>
                        <div className={`border-t mt-4 pt-2 ${isNegative ? 'border-red-200' : 'border-gray-300'}`}>
                              <div className="flex justify-between font-bold text-base"><span className={isNegative ? 'text-red-700' : 'text-green-700'}>Lucro Bruto</span><span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.grossProfit)}</span></div>
                              <div className="flex justify-between font-bold text-sm"><span className={isNegative ? 'text-red-700' : 'text-blue-700'}>Margem Final</span><span className={isNegative ? 'text-red-700' : 'text-blue-700'}>{formatPercentage(res.calculatedMargin)}</span></div>
                             {isNegative && (<div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs gap-1"><AlertTriangle className="w-4 h-4" /><span>PREJUÍZO</span></div>)}
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
          subtitle="Defina o preço de venda e descubra qual é o custo máximo de compra para manter a margem de lucro."
      >
          <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto"><label htmlFor="desiredPrice" className="block text-sm font-medium text-gray-700">Preço de Venda Desejado (R$):</label><input id="desiredPrice" type="number" value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value)} placeholder="120.00" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"/></div>
              <button onClick={handleInverseCalculation} className="w-full sm:w-auto mt-2 sm:mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">Calcular Custo Máximo</button>
          </div>
          {inverseCalcError && <p className="text-red-600 text-sm mt-2">{inverseCalcError}</p>}
          {inverseResults.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {displayedInverseResults.map((res) => {
                      const isNegative = res.maxProductCost && res.maxProductCost < 0;
                      const isDemo = isRestricted && res.platform === INVERSE_CALC_DEMO_PLATFORM;
                      return (
                          <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                              {isDemo && <FreebieBadge />}
                              { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (<span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>{res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}</span>)}
                              <div className={`flex items-center gap-2 mb-2 ${isDemo ? 'mt-5' : ''} ${ (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'justify-start' : 'justify-center' }`}>
                                  {getMarketplaceIcon(res.platform)}
                                  <h3 className="text-base font-bold text-gray-800">{(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}</h3>
                              </div>
                              <p className="text-gray-600 text-sm text-center">Custo Máximo do Produto</p>
                              <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(res.maxProductCost)}</p>
                              <div className="text-sm space-y-2 flex-grow">
                                  <div className="flex justify-between"><span className="text-gray-600">Preço de Venda</span><span className="font-medium text-gray-900">{formatCurrency(res.sellingPrice)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Margem ({formatPercentage(res.contributionMarginPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.grossProfit)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Comissão ({formatPercentage(res.commissionPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.commission)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Simples Nacional ({formatPercentage(res.taxPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.tax)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-600">Taxa Fixa/Frete</span><span className="font-medium text-gray-900">{formatCurrency(res.fixedFee)}</span></div>
                              </div>
                              <div className={`border-t mt-4 pt-2 ${isNegative ? 'border-red-200' : 'border-gray-300'}`}>
                                  <div className="flex justify-between font-bold text-base"><span className={isNegative ? 'text-red-700' : 'text-green-700'}>Margem Desejada</span><span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.grossProfit)}</span></div>
                                  <div className="flex justify-between font-bold text-sm"><span className={isNegative ? 'text-red-700' : 'text-blue-700'}>Margem Final</span><span className={isNegative ? 'text-red-700' : 'text-blue-700'}>{formatPercentage(res.calculatedMargin)}</span></div>
                                  {isNegative && (<div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs gap-1"><AlertTriangle className="w-4 h-4" /><span>INVIÁVEL</span></div>)}
                              </div>
                          </div>
                      );
                  })}
                  {lockedInversePlatforms.map(platform => <LockedPlatformCard key={platform} platform={platform} />)}
              </div>
          ) : (
              <div className="text-center text-gray-500 py-12"><p>Digite o preço de venda desejado e clique em "Calcular Custo Máximo".</p></div>
          )}
      </Card>

      <Card 
          title={isRestricted ? "Demonstrativo de Simulação de Margem" : "Simulação de Margem por Preço de Venda"}
          subtitle="Simule diferentes preços de venda e veja automaticamente o lucro e a margem em cada canal."
      >
          <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto"><label htmlFor="simProductCost" className="block text-sm font-medium text-gray-700">Custo Produto (R$):</label><input id="simProductCost" type="number" value={simProductCost} onChange={(e) => setSimProductCost(e.target.value)} placeholder="25.00" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"/></div>
              <div className="w-full sm:w-auto"><label htmlFor="simSellingPrice" className="block text-sm font-medium text-gray-700">Preço de Venda (R$):</label><input id="simSellingPrice" type="number" value={simSellingPrice} onChange={(e) => setSimSellingPrice(e.target.value)} placeholder="80.00" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"/></div>
              <button onClick={handleMarginSimulation} className="w-full sm:w-auto mt-2 sm:mt-6 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">Simular Margem</button>
          </div>
          {marginSimError && <p className="text-red-600 text-sm mt-2">{marginSimError}</p>}
          {marginResults.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {displayedMarginResults.map((res) => {
                  const isNegative = res.grossProfit < 0;
                  const isDemo = isRestricted && res.platform === MARGIN_SIM_DEMO_PLATFORM;
                  return (
                      <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                          {isDemo && <FreebieBadge />}
                          { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (<span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>{res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}</span>)}
                          <div className={`flex items-center gap-2 mb-2 ${isDemo ? 'mt-5' : ''} ${ (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'justify-start' : 'justify-center' }`}>
                              {getMarketplaceIcon(res.platform)}
                              <h3 className="text-base font-bold text-gray-800">{(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}</h3>
                          </div>
                          <p className="text-gray-600 text-sm text-center">Lucro Bruto</p>
                          <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(res.grossProfit)}</p>
                          <div className="text-sm space-y-2 flex-grow">
                              <div className="flex justify-between"><span className="text-gray-600">Preço de Venda</span><span className="font-medium text-gray-900">{formatCurrency(res.sellingPrice)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Custo do Produto</span><span className="font-medium text-gray-900">{formatCurrency(res.productCost)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Comissão ({formatPercentage(res.commissionPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.commission)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Simples Nacional ({formatPercentage(res.taxPercent)})</span><span className="font-medium text-gray-900">{formatCurrency(res.tax)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Taxa Fixa/Frete</span><span className="font-medium text-gray-900">{formatCurrency(res.fixedFee)}</span></div>
                          </div>
                          <div className={`border-t mt-4 pt-2 ${isNegative ? 'border-red-200' : 'border-gray-300'}`}>
                              <div className="flex justify-between font-bold text-base"><span className={isNegative ? 'text-red-700' : 'text-green-700'}>Lucro Bruto</span><span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.grossProfit)}</span></div>
                              <div className="flex justify-between font-bold text-sm"><span className={isNegative ? 'text-red-700' : 'text-blue-700'}>Margem Final</span><span className={isNegative ? 'text-red-700' : 'text-blue-700'}>{formatPercentage(res.calculatedMargin)}</span></div>
                              {isNegative && (<div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs gap-1"><AlertTriangle className="w-4 h-4" /><span>PREJUÍZO</span></div>)}
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
    </>
  );
}
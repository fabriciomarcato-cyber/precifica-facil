
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
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        const result = await activate(code);
        if (result.success) {
            setSuccess('Acesso completo ativado com sucesso!');
        } else {
            setError(result.message || 'Ocorreu um erro.');
        }
        setLoading(false);
    };
    
    return (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-semibold">
                    <KeyRound className="w-5 h-5" />
                    <span>Acesso completo desativado.</span>
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
                 {success && <p className="text-green-600">{success}</p>}
                 {accessMessage && !success && <p className="text-yellow-800">{accessMessage}</p>}
            </div>
        </div>
    );
};

const FeatureLockOverlay: React.FC = () => (
    <div className="absolute inset-0 bg-gray-100 bg-opacity-80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10 p-4 text-center">
        <Lock className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-gray-700">Recurso Exclusivo</h3>
        <p className="text-gray-500">Este recurso está disponível apenas no acesso completo.</p>
        <p className="text-sm mt-2 text-blue-600 font-semibold">Ative seu acesso para continuar.</p>
    </div>
);

const LockedPlatformCard: React.FC<{ platform: Platform }> = ({ platform }) => (
    <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 h-full min-h-[300px]">
         {getMarketplaceIcon(platform)}
         <h3 className="text-base font-bold text-gray-500 mt-2">
            {(platform === Platform.ML_CLASSICO || platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : platform}
         </h3>
         <div className="mt-4 text-center">
            <Lock className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Ative o acesso completo para ver este cálculo.</p>
         </div>
    </div>
);


const Card: React.FC<React.PropsWithChildren<{ title: string; subtitle: string; isLocked?: boolean }>> = ({ title, subtitle, children, isLocked }) => (
    <div className="relative bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
        {isLocked && <FeatureLockOverlay />}
        <div className={isLocked ? 'opacity-20 pointer-events-none' : ''}>
            <div className="border-b pb-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>
            {children}
        </div>
    </div>
);


export default function CalculatorSection({ settings, accessLevel, activate, expiration, accessMessage, revalidateAccess }: CalculatorSectionProps) {
  const [productCost, setProductCost] = useState('');
  const [priceResults, setPriceResults] = useState<CalculationResult[]>([]);

  const [desiredPrice, setDesiredPrice] = useState('');
  const [inverseResults, setInverseResults] = useState<CalculationResult[]>([]);

  const [simProductCost, setSimProductCost] = useState('');
  const [simSellingPrice, setSimSellingPrice] = useState('');
  const [marginResults, setMarginResults] = useState<CalculationResult[]>([]);

  const isRestricted = accessLevel === 'restricted';
  
  const handlePriceCalculation = () => {
    // Revalidate to update access state if a session expired, but DO NOT block the calculation.
    // The filtering of results after calculation will handle the restricted state.
    revalidateAccess();
    
    const cost = parseFloat(productCost);
    if (!isNaN(cost) && cost > 0) {
      setPriceResults(calculateIndividualPrices(cost, settings));
    } else {
      alert('Por favor, insira um custo de produto válido.');
      setPriceResults([]);
    }
  };
  
  const handleInverseCalculation = () => {
    // This is a premium feature, so we must check for valid access before calculating.
    if (!revalidateAccess()) return;
    const price = parseFloat(desiredPrice);
    if (!isNaN(price) && price > 0) {
      setInverseResults(calculateMaxCost(price, settings));
    } else {
      alert('Por favor, insira um preço de venda desejado válido.');
      setInverseResults([]);
    }
  };

  const handleMarginSimulation = () => {
    // This is a premium feature, so we must check for valid access before calculating.
    if (!revalidateAccess()) return;
    const cost = parseFloat(simProductCost);
    const price = parseFloat(simSellingPrice);
    if (!isNaN(cost) && !isNaN(price) && cost > 0 && price > 0) {
      setMarginResults(simulateMargin(cost, price, settings));
    } else {
      alert('Por favor, insira valores válidos para custo e preço de venda.');
      setMarginResults([]);
    }
  };
  
  const allPlatforms: Platform[] = [Platform.ML_CLASSICO, Platform.ML_PREMIUM, Platform.SHOPEE, Platform.TIKTOK_SHOP, Platform.INSTAGRAM];
  const activePlatforms = isRestricted ? [Platform.SHOPEE] : allPlatforms;
  const lockedPlatforms = isRestricted ? allPlatforms.filter(p => p !== Platform.SHOPEE) : [];
  const displayedPriceResults = priceResults.filter(r => activePlatforms.includes(r.platform));

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
        title="Demonstrativo de Cálculo de Preço"
        subtitle="Informe o custo do produto e veja o preço de venda ideal em cada marketplace, já considerando comissões, impostos e taxas."
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
        
        {priceResults.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {displayedPriceResults.map((res) => {
                    const isNegative = res.grossProfit < 0;
                    return (
                    <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                        { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                            <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                            </span>
                        )}
                        <div className={`flex items-center gap-2 mb-2 ${ (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'justify-start' : 'justify-center' }`}>
                           {getMarketplaceIcon(res.platform)}
                           <h3 className="text-base font-bold text-gray-800">
                             {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                           </h3>
                        </div>
                        <p className="text-gray-600 text-sm text-center">Preço mínimo de Venda</p>
                        <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(res.sellingPrice)}</p>
                        <div className="text-sm space-y-2 flex-grow">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Custo do Produto</span>
                                <span className="font-medium text-gray-900">{formatCurrency(res.productCost)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                <span className="font-medium text-gray-900">{formatCurrency(res.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                <span className="font-medium text-gray-900">{formatCurrency(res.commission)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                <span className="font-medium text-gray-900">{formatCurrency(res.tax)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Taxa Fixa/Frete</span>
                                <span className="font-medium text-gray-900">{formatCurrency(res.fixedFee)}</span>
                            </div>
                        </div>
                        <div className={`border-t mt-4 pt-2 ${isNegative ? 'border-red-200' : 'border-gray-300'}`}>
                              <div className="flex justify-between font-bold text-base">
                                <span className={isNegative ? 'text-red-700' : 'text-green-700'}>Lucro Bruto</span>
                                <span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.grossProfit)}</span>
                            </div>
                              <div className="flex justify-between font-bold text-sm">
                                <span className={isNegative ? 'text-red-700' : 'text-blue-700'}>Margem Final</span>
                                <span className={isNegative ? 'text-red-700' : 'text-blue-700'}>{formatPercentage(res.calculatedMargin)}</span>
                            </div>
                             {isNegative && (
                                <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>PREJUÍZO</span>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
                 {lockedPlatforms.map(platform => <LockedPlatformCard key={platform} platform={platform} />)}
            </div>
        ) : (
            <div className="text-center text-gray-500 py-12">
                <p className="text-lg">Digite o custo do produto e clique em "Calcular Preço de Venda".</p>
            </div>
        )}
      </Card>
      
      <Card 
        title="Cálculo Inverso - Qual Custo Comprar?"
        subtitle="Defina o preço de venda e descubra qual é o custo máximo de compra para manter a margem de lucro."
        isLocked={isRestricted}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto">
                <label htmlFor="desiredPrice" className="block text-sm font-medium text-gray-700">Preço de Venda Desejado (R$):</label>
                <input
                    id="desiredPrice"
                    type="number"
                    value={desiredPrice}
                    onChange={(e) => setDesiredPrice(e.target.value)}
                    placeholder="120.00"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"
                />
            </div>
            <button
                onClick={handleInverseCalculation}
                className="w-full sm:w-auto mt-2 sm:mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
                Calcular Custo Máximo
            </button>
        </div>
        {inverseResults.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {inverseResults.map((res) => {
                    const isNegative = res.maxProductCost && res.maxProductCost < 0;
                    return (
                        <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                            { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                    {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                </span>
                            )}
                            <div className={`flex items-center gap-2 mb-2 ${ (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'justify-start' : 'justify-center' }`}>
                                {getMarketplaceIcon(res.platform)}
                                <h3 className="text-base font-bold text-gray-800">
                                    {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                                </h3>
                            </div>
                            <p className="text-gray-600 text-sm text-center">Custo Máximo do Produto</p>
                            <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(res.maxProductCost)}</p>
                            
                            <div className="text-sm space-y-2 flex-grow">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Preço de Venda</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(res.sellingPrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Margem ({formatPercentage(res.contributionMarginPercent)})</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(res.grossProfit)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(res.commission)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(res.tax)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Taxa Fixa/Frete</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(res.fixedFee)}</span>
                                </div>
                            </div>

                            <div className={`border-t mt-4 pt-2 ${isNegative ? 'border-red-200' : 'border-gray-300'}`}>
                                <div className="flex justify-between font-bold text-base">
                                    <span className={isNegative ? 'text-red-700' : 'text-green-700'}>Margem Desejada</span>
                                    <span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.grossProfit)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm">
                                    <span className={isNegative ? 'text-red-700' : 'text-blue-700'}>Margem Final</span>
                                    <span className={isNegative ? 'text-red-700' : 'text-blue-700'}>{formatPercentage(res.calculatedMargin)}</span>
                                </div>
                                {isNegative && (
                                    <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs gap-1">
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
            <div className="text-center text-gray-500 py-12">
                <p>Digite o preço de venda desejado e clique em "Calcular Custo Máximo".</p>
            </div>
        )}
      </Card>

      <Card 
        title="Simulação de Margem por Preço de Venda"
        subtitle="Simule diferentes preços de venda e veja automaticamente o lucro e a margem em cada canal."
        isLocked={isRestricted}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto">
                <label htmlFor="simProductCost" className="block text-sm font-medium text-gray-700">Custo Produto (R$):</label>
                <input
                    id="simProductCost"
                    type="number"
                    value={simProductCost}
                    onChange={(e) => setSimProductCost(e.target.value)}
                    placeholder="25.00"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"
                />
            </div>
            <div className="w-full sm:w-auto">
                <label htmlFor="simSellingPrice" className="block text-sm font-medium text-gray-700">Preço de Venda (R$):</label>
                <input
                    id="simSellingPrice"
                    type="number"
                    value={simSellingPrice}
                    onChange={(e) => setSimSellingPrice(e.target.value)}
                    placeholder="80.00"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white text-gray-900"
                />
            </div>
            <button
                onClick={handleMarginSimulation}
                className="w-full sm:w-auto mt-2 sm:mt-6 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
                Simular Margem
            </button>
        </div>
        {marginResults.length > 0 ? (
           <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
               {marginResults.map((res) => {
                   const isNegative = res.grossProfit < 0;
                   return (
                       <div key={res.platform} className={`relative p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                           { (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) && (
                                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full text-white ${res.platform === Platform.ML_PREMIUM ? 'bg-blue-600' : 'bg-gray-500'}`}>
                                    {res.platform === Platform.ML_PREMIUM ? 'Premium' : 'Clássico'}
                                </span>
                           )}
                           <div className={`flex items-center gap-2 mb-2 ${ (res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'justify-start' : 'justify-center' }`}>
                               {getMarketplaceIcon(res.platform)}
                               <h3 className="text-base font-bold text-gray-800">
                                   {(res.platform === Platform.ML_CLASSICO || res.platform === Platform.ML_PREMIUM) ? 'Mercado Livre' : res.platform}
                               </h3>
                           </div>
                           <p className="text-gray-600 text-sm text-center">Lucro Bruto</p>
                           <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(res.grossProfit)}</p>
                           
                           <div className="text-sm space-y-2 flex-grow">
                               <div className="flex justify-between">
                                   <span className="text-gray-600">Preço de Venda</span>
                                   <span className="font-medium text-gray-900">{formatCurrency(res.sellingPrice)}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span className="text-gray-600">Custo do Produto</span>
                                   <span className="font-medium text-gray-900">{formatCurrency(res.productCost)}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span className="text-gray-600">Comissão ({formatPercentage(res.commissionPercent)})</span>
                                   <span className="font-medium text-gray-900">{formatCurrency(res.commission)}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span className="text-gray-600">Simples Nacional ({formatPercentage(res.taxPercent)})</span>
                                   <span className="font-medium text-gray-900">{formatCurrency(res.tax)}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span className="text-gray-600">Taxa Fixa/Frete</span>
                                   <span className="font-medium text-gray-900">{formatCurrency(res.fixedFee)}</span>
                               </div>
                           </div>

                           <div className={`border-t mt-4 pt-2 ${isNegative ? 'border-red-200' : 'border-gray-300'}`}>
                               <div className="flex justify-between font-bold text-base">
                                   <span className={isNegative ? 'text-red-700' : 'text-green-700'}>Lucro Bruto</span>
                                   <span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.grossProfit)}</span>
                               </div>
                               <div className="flex justify-between font-bold text-sm">
                                   <span className={isNegative ? 'text-red-700' : 'text-blue-700'}>Margem Final</span>
                                   <span className={isNegative ? 'text-red-700' : 'text-blue-700'}>{formatPercentage(res.calculatedMargin)}</span>
                               </div>
                               {isNegative && (
                                   <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs gap-1">
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
            <div className="text-center text-gray-500 py-12">
                <p>Preencha os campos e clique em "Simular Margem" para ver os resultados.</p>
            </div>
       )}
      </Card>
    </>
  );
}
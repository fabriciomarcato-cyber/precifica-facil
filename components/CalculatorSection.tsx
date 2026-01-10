
import React, { useState, useEffect } from 'react';
import type { AppSettings, CalculationResult } from '../types';
import { 
    calculateIndividualPrices, 
    calculateMaxCost, 
    simulateMargin,
    formatCurrency,
    formatPercentage
} from '../lib/calculator';
import { getMarketplaceIcon } from './MarketplaceIcons';

interface CalculatorSectionProps {
  settings: AppSettings;
}

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const Card: React.FC<React.PropsWithChildren<{ title: string; subtitle: string; }>> = ({ title, subtitle, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
        <div className="border-b pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        {children}
    </div>
);

const ResultsTable: React.FC<{ results: CalculationResult[]; headers: string[] }> = ({ results, headers }) => {
    if (!results.length) {
        return <div className="text-center text-gray-500 py-8">Preencha os campos e clique em calcular para ver os resultados.</div>;
    }

    return (
        <div className="overflow-x-auto mt-6">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                    <tr>
                        {headers.map(header => (
                            <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-b-2 border-gray-200">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {results.map(res => (
                        <tr key={res.platform} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{res.platform}</td>
                            {headers.includes('Preço de Venda (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(res.sellingPrice)}</td>}
                            {headers.includes('Custo Produto (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(res.productCost)}</td>}
                            {headers.includes('Taxa Fixa (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(res.fixedFee)}</td>}
                            {headers.includes('Comissão (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(res.commission)}</td>}
                            {headers.includes('Simples Nacional (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(res.tax)}</td>}
                            {headers.includes('Lucro Bruto (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">{formatCurrency(res.grossProfit)}</td>}
                            {headers.includes('Margem Calculada (%)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-700 font-semibold">{formatPercentage(res.calculatedMargin)}</td>}
                            {headers.includes('Custo Máximo do Produto (R$)') && <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">{formatCurrency(res.maxProductCost)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function CalculatorSection({ settings }: CalculatorSectionProps) {
  const [productCost, setProductCost] = useState('');
  const [priceResults, setPriceResults] = useState<CalculationResult[]>([]);

  const [desiredPrice, setDesiredPrice] = useState('');
  const [inverseResults, setInverseResults] = useState<CalculationResult[]>([]);

  const [simProductCost, setSimProductCost] = useState('');
  const [simSellingPrice, setSimSellingPrice] = useState('');
  const [marginResults, setMarginResults] = useState<CalculationResult[]>([]);
  
  useEffect(() => {
    const cost = parseFloat(productCost);
    if (!isNaN(cost) && cost > 0) {
      setPriceResults(calculateIndividualPrices(cost, settings));
    } else {
      setPriceResults([]);
    }
  }, [productCost, settings]);
  
  const handleInverseCalculation = () => {
    const price = parseFloat(desiredPrice);
    if (!isNaN(price) && price > 0) {
      setInverseResults(calculateMaxCost(price, settings));
    } else {
      alert('Por favor, insira um preço de venda desejado válido.');
    }
  };

  const handleMarginSimulation = () => {
    const cost = parseFloat(simProductCost);
    const price = parseFloat(simSellingPrice);
    if (!isNaN(cost) && !isNaN(price) && cost > 0 && price > 0) {
      setMarginResults(simulateMargin(cost, price, settings));
    } else {
      alert('Por favor, insira valores válidos para custo e preço de venda.');
    }
  };

  return (
    <>
      <Card 
        title="Demonstrativo de Cálculo de Preço"
        subtitle="Informe o custo do produto e veja o preço de venda ideal em cada marketplace, já considerando comissões, impostos e taxas."
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/3">
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
        </div>
        
        {priceResults.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {priceResults.map((res) => {
                    const isNegative = res.grossProfit < 0;
                    return (
                    <div key={res.platform} className={`p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                           {getMarketplaceIcon(res.platform)}
                           <h3 className="text-base font-bold text-gray-800">{res.platform}</h3>
                        </div>
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
                                    <WarningIcon className="w-4 h-4" />
                                    <span>PREJUÍZO</span>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        ) : (
            <div className="text-center text-gray-500 py-12">
                <p className="text-lg">Digite o custo do produto para ver o demonstrativo de preços.</p>
            </div>
        )}
      </Card>
      
      <Card 
        title="Cálculo Inverso - Qual Custo Comprar?"
        subtitle="Defina o preço de venda e descubra qual é o custo máximo de compra para manter a margem de lucro."
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
                    const isNegative = res.maxProductCost < 0;
                    return (
                    <div key={res.platform} className={`p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                           {getMarketplaceIcon(res.platform)}
                           <h3 className="text-base font-bold text-gray-800">{res.platform}</h3>
                        </div>
                        <p className={`text-3xl font-extrabold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-green-600'}`} title="Custo Máximo do Produto">{formatCurrency(res.maxProductCost)}</p>
                        <div className="text-sm space-y-2 flex-grow">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Preço de Venda</span>
                                <span className="font-medium text-gray-900">{formatCurrency(res.sellingPrice)}</span>
                            </div>
                             <div className="border-t border-gray-300 my-2"></div>
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
                                <span className={isNegative ? 'text-red-700' : 'text-green-700'}>Custo Máximo</span>
                                <span className={isNegative ? 'text-red-700' : 'text-green-700'}>{formatCurrency(res.maxProductCost)}</span>
                            </div>
                             {isNegative && (
                                <div className="flex items-center justify-center mt-2 text-red-700 font-bold text-xs text-center gap-1">
                                    <WarningIcon className="w-4 h-4" />
                                    <span>Custo inviável com esta margem/preço.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
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
                   <div key={res.platform} className={`p-4 rounded-lg border flex flex-col ${isNegative ? 'bg-red-50 border-red-400' : 'bg-slate-100 border-slate-200'}`}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                           {getMarketplaceIcon(res.platform)}
                           <h3 className="text-base font-bold text-gray-800">{res.platform}</h3>
                        </div>
                       <p className={`text-3xl font-extrabold text-center ${isNegative ? 'text-red-600' : 'text-green-600'}`} title="Lucro Bruto">{formatCurrency(res.grossProfit)}</p>
                       <p className={`text-lg font-bold text-center mb-4 ${isNegative ? 'text-red-600' : 'text-blue-600'}`} title="Margem Calculada">{formatPercentage(res.calculatedMargin)}</p>
                       <div className="text-sm space-y-2 flex-grow">
                            <div className="flex justify-between">
                               <span className="text-gray-600">Custo do Produto</span>
                               <span className="font-medium text-gray-900">{formatCurrency(res.productCost)}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-gray-600">Preço de Venda</span>
                               <span className="font-medium text-gray-900">{formatCurrency(res.sellingPrice)}</span>
                           </div>
                            <div className="border-t border-gray-300 my-2"></div>
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
                                    <WarningIcon className="w-4 h-4" />
                                    <span>PREJUÍZO</span>
                                </div>
                            )}
                       </div>
                   </div>
               )})}
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
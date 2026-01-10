
import React, { useState, useEffect } from 'react';
import type { AppSettings, CalculationResult } from '../types';
import { 
    calculateIndividualPrices, 
    calculateMaxCost, 
    simulateMargin,
    formatCurrency,
    formatPercentage
} from '../lib/calculator';

interface CalculatorSectionProps {
  settings: AppSettings;
}

const Card: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">{title}</h2>
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
      <Card title="Demonstrativo de Cálculo de Preço">
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
                {priceResults.map((res) => (
                    <div key={res.platform} className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex flex-col">
                        <h3 className="text-base font-bold text-gray-800 text-center mb-2">{res.platform}</h3>
                        <p className="text-3xl font-extrabold text-blue-600 text-center mb-4">{formatCurrency(res.sellingPrice)}</p>
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
                        <div className="border-t border-gray-300 mt-4 pt-2">
                              <div className="flex justify-between font-bold text-base">
                                <span className="text-green-700">Lucro Bruto</span>
                                <span className="text-green-700">{formatCurrency(res.grossProfit)}</span>
                            </div>
                              <div className="flex justify-between font-bold text-sm">
                                <span className="text-blue-700">Margem Final</span>
                                <span className="text-blue-700">{formatPercentage(res.calculatedMargin)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center text-gray-500 py-12">
                <p className="text-lg">Digite o custo do produto para ver o demonstrativo de preços.</p>
            </div>
        )}
      </Card>
      
      <Card title="Cálculo Inverso - Qual Custo Comprar?">
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
                {inverseResults.map((res) => (
                    <div key={res.platform} className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex flex-col">
                        <h3 className="text-base font-bold text-gray-800 text-center mb-2">{res.platform}</h3>
                        <p className="text-3xl font-extrabold text-green-600 text-center mb-4" title="Custo Máximo do Produto">{formatCurrency(res.maxProductCost)}</p>
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
                        <div className="border-t border-gray-300 mt-4 pt-2">
                              <div className="flex justify-between font-bold text-base">
                                <span className="text-green-700">Custo Máximo</span>
                                <span className="text-green-700">{formatCurrency(res.maxProductCost)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center text-gray-500 py-12">
                <p>Digite o preço de venda desejado e clique em "Calcular Custo Máximo".</p>
            </div>
        )}
      </Card>

      <Card title="Simulação de Margem por Preço de Venda">
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
               {marginResults.map((res) => (
                   <div key={res.platform} className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex flex-col">
                       <h3 className="text-base font-bold text-gray-800 text-center mb-2">{res.platform}</h3>
                       <p className="text-3xl font-extrabold text-green-600 text-center" title="Lucro Bruto">{formatCurrency(res.grossProfit)}</p>
                       <p className="text-lg font-bold text-blue-600 text-center mb-4" title="Margem Calculada">{formatPercentage(res.calculatedMargin)}</p>
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
                       <div className="border-t border-gray-300 mt-4 pt-2">
                             <div className="flex justify-between font-bold text-base">
                               <span className="text-green-700">Lucro Bruto</span>
                               <span className="text-green-700">{formatCurrency(res.grossProfit)}</span>
                           </div>
                             <div className="flex justify-between font-bold text-sm">
                               <span className="text-blue-700">Margem Final</span>
                               <span className="text-blue-700">{formatPercentage(res.calculatedMargin)}</span>
                           </div>
                       </div>
                   </div>
               ))}
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

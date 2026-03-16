
import React, { useState } from 'react';
import { Package, Info } from 'lucide-react';

export default function VolumetricWeightCalculator() {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [physicalWeight, setPhysicalWeight] = useState('');
  
  const l = parseFloat(length) || 0;
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;
  const pw = parseFloat(physicalWeight) || 0;
  
  const volumetricWeight = (l * w * h) / 6000;
  
  // Mercado Livre rule: if volumetric <= 2kg, use physical weight.
  // If volumetric > 2kg, use the greater of physical and volumetric.
  const finalWeight = volumetricWeight <= 2 ? pw : Math.max(pw, volumetricWeight);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
      <div className="border-b pb-4 mb-6 flex items-center gap-3">
        <Package className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Calculadora de Peso Volumétrico (Mercado Livre)</h2>
          <p className="text-sm text-gray-500">Descubra qual peso será usado para calcular o seu frete.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Comprimento (cm)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="Ex: 30"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Largura (cm)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="Ex: 20"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Altura (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="Ex: 15"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Peso Físico (kg)</label>
          <input
            type="number"
            value={physicalWeight}
            onChange={(e) => setPhysicalWeight(e.target.value)}
            placeholder="Ex: 0.5"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-white text-gray-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-6 rounded-lg border border-blue-100">
        <div className="text-center md:text-left">
          <p className="text-sm text-blue-800 font-semibold mb-1">Peso Volumétrico Calculado:</p>
          <p className="text-3xl font-bold text-blue-600">{volumetricWeight.toFixed(3)} kg</p>
          <p className="text-xs text-blue-500 mt-1">(C x L x A) / 6000</p>
        </div>
        
        <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-blue-200 pt-4 md:pt-0 md:pl-6">
          <p className="text-sm text-gray-700 font-semibold mb-1">Peso Taxável Final:</p>
          <p className="text-4xl font-black text-gray-900">{finalWeight.toFixed(3)} kg</p>
          <div className="flex items-center justify-center md:justify-end gap-1 mt-2 text-xs text-gray-500">
            <Info className="w-3 h-3" />
            <span>
              {volumetricWeight <= 2 
                ? "Volumétrico ≤ 2kg: ML usa o peso físico." 
                : volumetricWeight > pw 
                  ? "Volumétrico > Físico: será usado o volumétrico." 
                  : "Físico > Volumétrico: será usado o físico."}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100 flex gap-3">
        <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-800">
          <strong>Atenção:</strong> O peso que você deve inserir nas <strong>Configurações</strong> do Precifica Fácil para o Mercado Livre é este <strong>Peso Taxável Final</strong>. É com base nele que o sistema calculará o frete correto.
        </p>
      </div>
    </div>
  );
}

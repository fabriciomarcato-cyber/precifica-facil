import React, { useState } from 'react';
import { AppSettings, CalculationResult, Platform } from '../types';
import { formatCurrency, formatPercentage } from '../lib/calculator';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface ResultsComparisonTableProps {
  results: CalculationResult[];
  mode: 'price' | 'inverse' | 'margin';
  settings: AppSettings;
  currentWeight: number;
}

const getChannelDotClass = (platform: Platform): string => {
  switch (platform) {
    case Platform.ML_CLASSICO:
    case Platform.ML_PREMIUM:
      return 'bg-yellow-400 ring-1 ring-yellow-500/40';
    case Platform.SHOPEE:
      return 'bg-[#EE4D2D]';
    case Platform.TIKTOK_SHOP:
    case Platform.SHEIN:
      return 'bg-neutral-900';
    case Platform.INSTAGRAM:
      return 'bg-blue-600';
    default:
      return 'bg-slate-400';
  }
};

const getChannelDisplayName = (platform: Platform): string => {
  if (platform === Platform.ML_CLASSICO || platform === Platform.ML_PREMIUM) {
    return 'Mercado Livre';
  }
  return platform;
};

export default function ResultsComparisonTable({
  results,
  mode,
  settings,
  currentWeight,
}: ResultsComparisonTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (platform: Platform) => {
    setExpandedRows((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const renderTypeBadge = (res: CalculationResult) => {
    if (res.platform === Platform.ML_CLASSICO) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          Clássico
        </span>
      );
    }
    if (res.platform === Platform.ML_PREMIUM) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
          Premium
        </span>
      );
    }
    if (res.platform === Platform.SHOPEE) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 uppercase whitespace-nowrap">
          {settings.shopee.sellerType}
        </span>
      );
    }
    if (res.platform === Platform.TIKTOK_SHOP && (settings.tiktok.affiliateCommission || 0) > 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          +{settings.tiktok.affiliateCommission}% Afiliado
        </span>
      );
    }
    return null;
  };

  const renderChannelSubtext = (res: CalculationResult) => {
    const weight = res.weightUsed ?? currentWeight;
    switch (res.platform) {
      case Platform.ML_CLASSICO:
      case Platform.ML_PREMIUM:
        return `Comissão ${formatPercentage(res.commissionPercent)} · Peso ${weight}kg`;
      case Platform.SHOPEE:
        return `Comissão ${formatPercentage(res.commissionPercent)}${settings.shopee.inCampaign ? ' · Campanha +2,5%' : ''}`;
      case Platform.SHEIN:
        return `Comissão fixa ${formatPercentage(res.commissionPercent)} · Peso ${weight}kg`;
      case Platform.TIKTOK_SHOP:
        return res.sellingPrice && res.sellingPrice < 50
          ? '10% + R$ 4,00 (< R$ 50)'
          : '6% + R$ 6,00 (≥ R$ 50)';
      case Platform.INSTAGRAM:
        return `Taxas recebimento (${formatPercentage(res.commissionPercent)})`;
      default:
        return `Comissão ${formatPercentage(res.commissionPercent)}`;
    }
  };

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[780px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <th scope="col" className="py-3 pl-4 pr-3">
              Canal
            </th>
            <th scope="col" className="py-3 px-3 text-right">
              {mode === 'inverse' ? 'Custo Máximo' : 'Preço de Venda'}
            </th>
            <th scope="col" className="py-3 px-3 text-right">
              Comissão &amp; Taxas
            </th>
            <th scope="col" className="py-3 px-3 text-right">
              Imposto (Simples)
            </th>
            <th scope="col" className="py-3 px-3 text-right">
              {mode === 'inverse' ? 'Margem Desejada' : 'Lucro Bruto'}
            </th>
            <th scope="col" className="py-3 px-3 text-right">
              Margem Final
            </th>
            <th scope="col" className="py-3 pl-2 pr-4 w-12 text-center">
              <span className="sr-only">Detalhes</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200 bg-white">
          {results.map((res) => {
            const isNegative =
              mode === 'inverse'
                ? res.maxProductCost !== undefined && res.maxProductCost < 0
                : res.grossProfit < 0;
            const isExpanded = !!expandedRows[res.platform];
            const primaryValue = mode === 'inverse' ? res.maxProductCost : res.sellingPrice;

            return (
              <React.Fragment key={res.platform}>
                <tr
                  onClick={() => toggleRow(res.platform)}
                  className={`group cursor-pointer transition-colors duration-150 hover:bg-slate-50 ${
                    isExpanded ? 'bg-slate-50/70' : 'bg-white'
                  } ${isNegative ? 'bg-red-50/30 hover:bg-red-50/50' : ''}`}
                >
                  {/* Canal */}
                  <td className="py-3.5 pl-4 pr-3 align-middle">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${getChannelDotClass(
                          res.platform
                        )}`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {getChannelDisplayName(res.platform)}
                          </span>
                          {renderTypeBadge(res)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                          {renderChannelSubtext(res)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Preço de Venda (ou Custo Máximo no Cálculo Inverso) */}
                  <td className="py-3.5 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                    <div
                      className={`text-lg font-bold tracking-tight ${
                        isNegative ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {formatCurrency(primaryValue)}
                    </div>
                    {mode === 'inverse' && (
                      <div className="text-[11px] text-slate-500">
                        Venda: {formatCurrency(res.sellingPrice)}
                      </div>
                    )}
                    {isNegative && (
                      <div className="inline-flex items-center justify-end gap-1 text-[10px] font-semibold text-red-600 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{mode === 'inverse' ? 'Inviável' : 'Prejuízo'}</span>
                      </div>
                    )}
                  </td>

                  {/* Comissão & Taxas */}
                  <td className="py-3.5 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                    <div className="text-sm font-medium text-slate-800">
                      {formatCurrency(res.commission)}
                      <span className="text-[11px] text-slate-500 ml-1">
                        ({formatPercentage(res.commissionPercent)})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {res.platform === Platform.SHEIN ? 'Frete:' : 'Fixa/Frete:'}{' '}
                      <span className="font-medium text-slate-700">
                        {formatCurrency(res.fixedFee)}
                      </span>
                    </div>
                  </td>

                  {/* Imposto (Simples) */}
                  <td className="py-3.5 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                    <div className="text-sm font-medium text-slate-800">
                      {formatCurrency(res.tax)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatPercentage(res.taxPercent)}
                    </div>
                  </td>

                  {/* Lucro Bruto */}
                  <td className="py-3.5 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                    <span
                      className={`text-sm font-semibold ${
                        isNegative ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(res.grossProfit)}
                    </span>
                  </td>

                  {/* Margem Final */}
                  <td className="py-3.5 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        isNegative
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {formatPercentage(res.calculatedMargin)}
                    </span>
                  </td>

                  {/* Botão Expandir */}
                  <td className="py-3.5 pl-2 pr-4 text-center align-middle">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(res.platform);
                      }}
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded
                          ? `Recolher detalhes de ${res.platform}`
                          : `Expandir detalhes de ${res.platform}`
                      }
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                  </td>
                </tr>

                {/* Sub-área expansível com breakdown completo */}
                {isExpanded && (
                  <tr className="bg-slate-50/90">
                    <td colSpan={7} className="px-4 py-3.5 border-t border-slate-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                        <div>
                          <span className="block text-[11px] text-slate-500">
                            {mode === 'inverse' ? 'Custo Máximo' : 'Custo do Produto'}
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                            {formatCurrency(
                              mode === 'inverse' ? res.maxProductCost : res.productCost
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500">
                            Margem ({formatPercentage(res.contributionMarginPercent ?? res.calculatedMargin)})
                          </span>
                          <span
                            className={`font-semibold tabular-nums mt-0.5 block ${
                              isNegative ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatCurrency(res.grossProfit)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500">
                            Comissão ({formatPercentage(res.commissionPercent)})
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                            {formatCurrency(res.commission)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500">
                            {res.platform === Platform.SHEIN
                              ? 'Frete Shein (por peso)'
                              : 'Taxa Fixa / Frete'}
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                            {formatCurrency(res.fixedFee)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[11px] text-slate-500">
                            Simples Nacional ({formatPercentage(res.taxPercent)})
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                            {formatCurrency(res.tax)}
                          </span>
                        </div>

                        {res.breakEvenPrice !== undefined && res.breakEvenPrice > 0 ? (
                          <div>
                            <span className="block text-[11px] text-slate-500">
                              Ponto de Equilíbrio
                            </span>
                            <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                              {formatCurrency(res.breakEvenPrice)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="block text-[11px] text-slate-500">
                              Preço de Venda
                            </span>
                            <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                              {formatCurrency(res.sellingPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

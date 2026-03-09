
import React, { useState, useMemo } from 'react';
import { AppSettings } from '../types';
import { runShopeeBatchConference, ShopeeBatchResult } from '../services/geminiService';
import { AlertCircle, CheckCircle, Info, Loader2, Upload, FileJson, FileSpreadsheet, Download, Filter, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/calculator';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ShopeeBatchConferenceProps {
  settings: AppSettings;
  accessLevel: 'restricted' | 'full';
}

export default function ShopeeBatchConference({ settings, accessLevel }: ShopeeBatchConferenceProps) {
  const [inputData, setInputData] = useState('');
  const [results, setResults] = useState<ShopeeBatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'adjustment'>('all');

  const filteredResults = useMemo(() => {
    if (filterType === 'all') return results;
    return results.filter(r => r.precisa_de_reajuste);
  }, [results, filterType]);

  const handleRunBatch = async () => {
    if (!inputData.trim()) {
      setError('Por favor, insira os dados dos produtos (CSV ou JSON).');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const batchResults = await runShopeeBatchConference(inputData, settings);
      setResults(batchResults);
    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro ao processar os dados. Verifique o formato e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredResults.map(item => ({
      'SKU': item.sku,
      'Descrição': item.descricao_produto,
      'Estoque': item.estoque,
      'Custo': item.custo_produto,
      'Preço Atual': item.preco_venda_atual,
      'Margem Atual (%)': item.margem_atual_porcentagem,
      'Novo Preço': item.novo_preco_venda,
      'Nova Margem (%)': item.margem_novo_preco_porcentagem,
      'Precisa Reajuste': item.precisa_de_reajuste ? 'Sim' : 'Não'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Shopee');
    XLSX.writeFile(workbook, `Relatorio_Shopee_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Conferência Shopee - Precifica Fácil', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Data: ${dateStr} às ${timeStr}`, 14, 30);
    doc.text(`Filtro: ${filterType === 'all' ? 'Todos os Produtos' : 'Apenas Reajustes'}`, 14, 35);

    const tableColumn = ["SKU", "Descrição", "Estoque", "Custo", "Preço Atual", "Margem", "Novo Preço", "Nova Margem"];
    const tableRows = filteredResults.map(item => [
      item.sku,
      item.descricao_produto,
      item.estoque,
      formatCurrency(item.custo_produto),
      formatCurrency(item.preco_venda_atual),
      `${item.margem_atual_porcentagem.toFixed(2)}%`,
      formatCurrency(item.novo_preco_venda),
      `${item.margem_novo_preco_porcentagem.toFixed(2)}%`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Relatorio_Shopee_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getStatusIcon = (needsAdjustment: boolean) => {
    if (!needsAdjustment) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusClass = (needsAdjustment: boolean) => {
    if (!needsAdjustment) return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-200">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Conferência em Lote - Shopee</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cole sua lista de produtos (CSV ou JSON) para conferir margens e preços ideais rapidamente.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dados dos Produtos (SKU, Descrição, Preço Atual, Estoque, Custo):
          </label>
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder={`Exemplo SEM cabeçalho:\n2237,Produto X,89.90,10,50.00\n\nExemplo COM cabeçalho:\nSKU,Descrição,Preço Atual,Estoque,Custo\n2237,Produto X,89.90,10,50.00`}
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={handleRunBatch}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Iniciar Conferência
                </>
              )}
            </button>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Suporta CSV</span>
              </div>
              <div className="flex items-center gap-1">
                <FileJson className="w-4 h-4" />
                <span>Suporta JSON</span>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('adjustment')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filterType === 'adjustment' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Apenas Reajustes
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-700 transition-colors"
                  title="Exportar para Excel"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-700 transition-colors"
                  title="Exportar para PDF"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>Exibindo <strong>{filteredResults.length}</strong> de <strong>{results.length}</strong> produtos</span>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Atual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margem Atual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Novo Preço</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nova Margem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reajuste?</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={item.descricao_produto}>
                      {item.descricao_produto}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {item.estoque}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(item.custo_produto)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(item.preco_venda_atual)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${item.precisa_de_reajuste ? 'text-red-600' : 'text-green-600'}`}>
                      {item.margem_atual_porcentagem.toFixed(2)}%
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${item.precisa_de_reajuste ? 'text-blue-600' : 'text-gray-600'}`}>
                      {formatCurrency(item.novo_preco_venda)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.margem_novo_preco_porcentagem.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(item.precisa_de_reajuste)}`}>
                        {getStatusIcon(item.precisa_de_reajuste)}
                        {item.precisa_de_reajuste ? 'Sim' : 'Não'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


import React, { useState, useMemo, useRef } from 'react';
import { AppSettings } from '../types';
import { runShopeeBatchConference, ShopeeBatchResult } from '../services/geminiService';
import { AlertCircle, CheckCircle, Info, Loader2, Upload, FileJson, FileSpreadsheet, Download, Filter, FileText, FileUp, Lock } from 'lucide-react';
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
  const [sortType, setSortType] = useState<'none' | 'alphabetical' | 'margin-asc' | 'margin-desc'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredResults = useMemo(() => {
    let baseResults = filterType === 'all' ? [...results] : results.filter(r => r.precisa_de_reajuste);
    
    if (sortType === 'alphabetical') {
      baseResults.sort((a, b) => a.descricao_produto.localeCompare(b.descricao_produto));
    } else if (sortType === 'margin-asc') {
      baseResults.sort((a, b) => a.margem_atual_porcentagem - b.margem_atual_porcentagem);
    } else if (sortType === 'margin-desc') {
      baseResults.sort((a, b) => b.margem_atual_porcentagem - a.margem_atual_porcentagem);
    }
    
    return baseResults;
  }, [results, filterType, sortType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to CSV format for Gemini
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      setInputData(csvData);
      
      // Reset input to allow uploading same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleRunBatch = async () => {
    if (!inputData.trim()) {
      setError('Por favor, insira os dados dos produtos (CSV, Excel ou JSON).');
      return;
    }

    setIsLoading(true);
    setError('');
  try {
    const batchResults = await runShopeeBatchConference(inputData, settings);
    if (batchResults.length === 0) {
      setError('O modelo não retornou resultados. Verifique se os dados estão no formato correto (SKU, Descrição, Custo, Estoque, Preço de Venda Atual).');
    } else {
      setResults(batchResults);
    }
  } catch (err: any) {
    console.error(err);
    const errorMessage = err.message || 'Erro desconhecido';
    setError(`Erro ao processar: ${errorMessage}. Verifique sua conexão e os dados inseridos.`);
  } finally {
    setIsLoading(false);
  }
  };

  const exportToExcel = () => {
    const dataToExport = filteredResults.map(item => ({
      'SKU': item.sku,
      'Descrição': item.descricao_produto,
      'Custo': item.custo_produto,
      'Comissão (%)': item.comissao_porcentagem,
      'Taxa Fixa (R$)': item.taxa_fixa,
      'Estoque': item.estoque,
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

    const tableColumn = ["SKU", "Descrição", "Custo", "Comissão", "Taxa", "Estoque", "Preço Atual", "Margem", "Novo Preço", "Nova Margem"];
    const tableRows = filteredResults.map(item => [
      item.sku,
      item.descricao_produto,
      formatCurrency(item.custo_produto),
      `${item.comissao_porcentagem}%`,
      formatCurrency(item.taxa_fixa),
      item.estoque,
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
    <div className="relative overflow-hidden rounded-2xl shadow-2xl mb-8 border border-orange-600">
      {accessLevel === 'restricted' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[6px] transition-all">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center text-center max-w-sm mx-4 transform scale-110">
            <div className="bg-orange-100 p-4 rounded-full mb-4">
              <Lock className="w-10 h-10 text-[#EE4D2D]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">DISPONÍVEL NO PLANO PRO</h3>
            <p className="text-sm text-gray-600 font-medium mb-6">
              A Conferência em Lote permite analisar centenas de produtos da Shopee de uma só vez usando Inteligência Artificial.
            </p>
            <div className="w-full p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-6">
              <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">Benefícios Pro:</p>
              <ul className="text-left text-[10px] text-orange-700 font-bold space-y-1">
                <li>• Importação de Planilhas (Excel/CSV)</li>
                <li>• Análise Instantânea com IA</li>
                <li>• Exportação para PDF e Excel</li>
                <li>• Filtros Avançados de Reajuste</li>
              </ul>
            </div>
            <p className="text-xs font-black text-[#EE4D2D] uppercase tracking-widest animate-bounce">Ative seu acesso Pro para liberar</p>
          </div>
        </div>
      )}
      <div className={`bg-gradient-to-br from-[#EE4D2D] to-[#FF6321] p-8 text-white ${accessLevel === 'restricted' ? 'filter blur-[2px] pointer-events-none' : ''}`}>
        <div className="border-b border-white/20 pb-6 mb-8">
        <div className="text-center">
          <h2 className="text-3xl font-black uppercase tracking-tighter">CONFERÊNCIA EM LOTE - SHOPEE</h2>
          <p className="text-sm text-white/80 font-medium mt-1">
            Analise margens e preços ideais para centenas de produtos simultaneamente.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <label className="block text-xs font-black uppercase tracking-widest text-white/90 mb-2">
                Dados dos Produtos (SKU, Descrição, Custo, Estoque, Preço Atual):
              </label>
              <div className="flex items-center gap-2 text-white/70">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold">Dica: Você pode colar diretamente do Excel ou subir o arquivo abaixo.</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black py-2.5 px-4 rounded-xl border border-white/30 transition-all shadow-lg backdrop-blur-sm uppercase tracking-wider"
              >
                <FileUp className="w-4 h-4" />
                Importar Planilha
              </button>
            </div>
          </div>
          
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder={`Exemplo:\nSKU,Descrição,Custo,Estoque,Preço de Venda Atual\n2237,Produto X,50.00,10,89.90`}
            className="w-full h-48 p-4 bg-white/10 border border-white/30 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-transparent font-mono text-sm text-white placeholder-white/40 shadow-inner backdrop-blur-sm"
          />
        </div>

        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={handleRunBatch}
              disabled={isLoading}
              className="flex items-center gap-3 bg-white text-[#EE4D2D] font-black py-3 px-8 rounded-xl hover:bg-gray-100 transition-all disabled:bg-white/50 shadow-xl uppercase tracking-wider text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando IA...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Iniciar Análise
                </>
              )}
            </button>
            
            <div className="flex items-center gap-4 text-[10px] text-white/60 font-black uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel/CSV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileJson className="w-4 h-4" />
                <span>JSON</span>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-6 bg-black/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Filtrar:</span>
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/20">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${filterType === 'all' ? 'bg-white text-[#EE4D2D] shadow-lg' : 'text-white/70 hover:text-white'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterType('adjustment')}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider ${filterType === 'adjustment' ? 'bg-white text-red-600 shadow-lg' : 'text-white/70 hover:text-white'}`}
                  >
                    Reajustes
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Ordenar:</span>
                <select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value as any)}
                  className="bg-white/10 border border-white/20 text-white text-[10px] font-black rounded-xl focus:ring-2 focus:ring-white/50 block p-2 shadow-lg uppercase tracking-wider outline-none"
                >
                  <option value="none" className="text-gray-900">Padrão</option>
                  <option value="alphabetical" className="text-gray-900">Alfabética</option>
                  <option value="margin-asc" className="text-gray-900">Margem (Menor)</option>
                  <option value="margin-desc" className="text-gray-900">Margem (Maior)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 ml-auto border-l border-white/20 pl-6">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-green-500 text-white text-[10px] font-black py-2.5 px-4 rounded-xl hover:bg-green-600 transition-all shadow-lg uppercase tracking-wider"
                  title="Exportar para Excel"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 bg-red-600 text-white text-[10px] font-black py-2.5 px-4 rounded-xl hover:bg-red-700 transition-all shadow-lg uppercase tracking-wider"
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
          <div className="p-4 bg-white/10 border border-white/20 text-white rounded-xl flex items-center gap-3 backdrop-blur-md animate-pulse">
            <AlertCircle className="w-6 h-6 text-yellow-300" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-white">
            <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                <Filter className="w-4 h-4" />
                <span>Exibindo <strong>{filteredResults.length}</strong> de <strong>{results.length}</strong> produtos</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">SKU</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Descrição</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Custo</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Comissão</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Taxa</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Estoque</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Preço Atual</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Margem Atual</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Novo Preço</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Nova Margem</th>
                    <th className="px-4 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredResults.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-gray-900">{item.sku}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-600 max-w-xs truncate" title={item.descricao_produto}>
                        {item.descricao_produto}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                        {formatCurrency(item.custo_produto)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                        {item.comissao_porcentagem}%
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                        {formatCurrency(item.taxa_fixa)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-gray-400 font-mono">
                        {item.estoque}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(item.preco_venda_atual)}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-black ${item.precisa_de_reajuste ? 'text-red-600' : 'text-green-600'}`}>
                        {item.margem_atual_porcentagem.toFixed(2)}%
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-base font-black ${item.precisa_de_reajuste ? 'text-blue-600' : 'text-gray-900'}`}>
                        {formatCurrency(item.novo_preco_venda)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                        {item.margem_novo_preco_porcentagem.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusClass(item.precisa_de_reajuste)}`}>
                          {getStatusIcon(item.precisa_de_reajuste)}
                          {item.precisa_de_reajuste ? 'Reajustar' : 'Ok'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppSettings } from '../types';
import {
  MLBatchItem,
  MLBatchStatus,
  MLBatchParams,
  calculateMLItem,
  parseMercadoLivreWorkbook,
  parseDeParaWorkbook,
  generateSampleMercadoLivreWorkbook,
  generateSampleDeParaWorkbook
} from '../lib/mlBatchCalculator';
import { formatCurrency } from '../lib/calculator';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  FileUp,
  Search,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpDown,
  Trash2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MercadoLivreBatchConferenceProps {
  settings: AppSettings;
}

export default function MercadoLivreBatchConference({ settings }: MercadoLivreBatchConferenceProps) {
  // Input data states
  const [items, setItems] = useState<MLBatchItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [inputDataText, setInputDataText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Parameters (editable in this module, defaults from settings)
  const [simplesNacional, setSimplesNacional] = useState<number>(settings.simplesNacional || 6);
  const [margemMeta, setMargemMeta] = useState<number>(settings.mercadoLivre.contributionMargin || 20);
  const [defaultCommission, setDefaultCommission] = useState<number>(settings.mercadoLivre.classicCommission || 14);

  // Cost controls
  const [globalCost, setGlobalCost] = useState<string>('');
  const [deParaStatus, setDeParaStatus] = useState<string>('');

  // Table filters and pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | MLBatchStatus>('all');
  const [sortField, setSortField] = useState<'none' | 'sku' | 'titulo' | 'preco' | 'custo' | 'lucro' | 'margem'>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deParaInputRef = useRef<HTMLInputElement>(null);

  // Sync initial settings if settings change and module hasn't been edited
  useEffect(() => {
    if (settings.simplesNacional) setSimplesNacional(settings.simplesNacional);
    if (settings.mercadoLivre.contributionMargin) setMargemMeta(settings.mercadoLivre.contributionMargin);
    if (settings.mercadoLivre.classicCommission) setDefaultCommission(settings.mercadoLivre.classicCommission);
  }, [settings.simplesNacional, settings.mercadoLivre.contributionMargin, settings.mercadoLivre.classicCommission]);

  const calculationParams: MLBatchParams = useMemo(() => ({
    taxPercent: simplesNacional,
    targetMarginPercent: margemMeta,
    defaultCommission
  }), [simplesNacional, margemMeta, defaultCommission]);

  // Recalculate all items when calculation parameters change
  const recalculateAll = (currentItems: MLBatchItem[], params: MLBatchParams) => {
    return currentItems.map(item => calculateMLItem(item, params));
  };

  const handleParamsChange = (newParams: Partial<MLBatchParams>) => {
    const updated: MLBatchParams = {
      ...calculationParams,
      ...newParams
    };
    if (newParams.taxPercent !== undefined) setSimplesNacional(newParams.taxPercent);
    if (newParams.targetMarginPercent !== undefined) setMargemMeta(newParams.targetMarginPercent);
    if (newParams.defaultCommission !== undefined) setDefaultCommission(newParams.defaultCommission);

    if (items.length > 0) {
      setItems(recalculateAll(items, updated));
      setSuccessMsg('Indicadores recalculados com base nas novas alíquotas e margens!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // 1. Processamento de Upload da Planilha do Mercado Livre (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const { items: parsedItems, errors } = parseMercadoLivreWorkbook(workbook, calculationParams);

        if (errors.length > 0 && parsedItems.length === 0) {
          setErrorMsg(errors.join(' '));
          setIsProcessing(false);
          return;
        }

        if (parsedItems.length === 0) {
          setErrorMsg('Nenhum anúncio foi extraído. Verifique o cabeçalho da planilha do Mercado Livre.');
          setIsProcessing(false);
          return;
        }

        const itemsWithCost = parsedItems.filter(i => i.custo > 0).length;
        setItems(parsedItems);
        setCurrentPage(1);
        setSuccessMsg(
          `Sucesso! ${parsedItems.length} anúncios do Mercado Livre foram carregados${
            itemsWithCost > 0
              ? ` (${itemsWithCost} com Custo do Produto identificado e calculado)`
              : ''
          }.`
        );
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err: any) {
        console.error('Erro ao ler arquivo ML:', err);
        setErrorMsg('Erro ao ler o arquivo. Certifique-se de que é uma planilha Excel (.xlsx/.xls) ou CSV válida.');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setErrorMsg('Erro ao abrir o arquivo.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // 2. Processamento de Dados Colados Manualmente (Texto / CSV / TSV)
  const handleProcessTextData = () => {
    if (!inputDataText.trim()) {
      setErrorMsg('Insira ou cole os dados da planilha na área de texto.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      // Ler texto usando XLSX para respeitar separadores de vírgula, ponto e vírgula e tabulações
      const workbook = XLSX.read(inputDataText, { type: 'string' });
      const { items: parsedItems, errors } = parseMercadoLivreWorkbook(workbook, calculationParams);

      if (parsedItems.length === 0) {
        setErrorMsg(errors.length > 0 ? errors.join(' ') : 'Não foi possível extrair dados válidos do texto colado.');
        setIsProcessing(false);
        return;
      }

      const itemsWithCost = parsedItems.filter(i => i.custo > 0).length;
      setItems(parsedItems);
      setFileName('Dados colados');
      setCurrentPage(1);
      setSuccessMsg(
        `${parsedItems.length} anúncios processados com sucesso!${
          itemsWithCost > 0
            ? ` (${itemsWithCost} com Custo do Produto identificado)`
            : ''
        }`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao processar dados de texto.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Aplicação de Custo Global Fixo
  const handleApplyGlobalCost = () => {
    const costVal = parseFloat(globalCost.replace(',', '.'));
    if (isNaN(costVal) || costVal < 0) {
      setErrorMsg('Informe um valor de custo global válido.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Carregue os anúncios antes de aplicar o custo global.');
      return;
    }

    const updated = items.map(it =>
      calculateMLItem({ ...it, custo: costVal }, calculationParams)
    );
    setItems(updated);
    setSuccessMsg(`Custo global de ${formatCurrency(costVal)} aplicado a todos os ${items.length} anúncios!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 4. Upload de Arquivo De-Para por SKU
  const handleDeParaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (items.length === 0) {
      setErrorMsg('Carregue primeiro a planilha de anúncios do Mercado Livre antes de enviar o De-Para.');
      if (deParaInputRef.current) deParaInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const { costMap, totalMatchedRows, errors } = parseDeParaWorkbook(workbook);

        if (errors.length > 0 && costMap.size === 0) {
          setErrorMsg(errors.join(' '));
          return;
        }

        let updatedCount = 0;
        const updated = items.map(it => {
          const key = it.sku.trim().toUpperCase();
          if (costMap.has(key)) {
            const newCost = costMap.get(key)!;
            updatedCount++;
            return calculateMLItem({ ...it, custo: newCost }, calculationParams);
          }
          return it;
        });

        setItems(updated);
        setDeParaStatus(`${updatedCount} de ${items.length} anúncios atualizados via De-Para (${file.name})`);
        setSuccessMsg(`De-Para aplicado com sucesso! ${updatedCount} anúncios tiveram seus custos atualizados.`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err: any) {
        console.error('Erro no De-Para:', err);
        setErrorMsg('Erro ao ler arquivo De-Para. Certifique-se de que contenha colunas SKU e Custo.');
      } finally {
        if (deParaInputRef.current) deParaInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // 5. Edição Manual de Custo por Linha
  const handleIndividualCostChange = (itemId: string, newCostStr: string) => {
    const cleanNum = parseFloat(newCostStr.replace(',', '.'));
    const safeCost = isNaN(cleanNum) || cleanNum < 0 ? 0 : cleanNum;

    setItems(prev =>
      prev.map(it => {
        if (it.id === itemId) {
          return calculateMLItem({ ...it, custo: safeCost }, calculationParams);
        }
        return it;
      })
    );
  };

  // 6. KPIs Globais (Cards de Resumo)
  const kpiStats = useMemo(() => {
    const totalAnuncios = items.length;
    if (totalAnuncios === 0) {
      return {
        totalAnuncios: 0,
        faturamentoEstimado: 0,
        lucroTotalEstimado: 0,
        qtdPrejuizo: 0,
        qtdAlerta: 0,
        qtdSaudavel: 0,
        margemMediaGeral: 0
      };
    }

    let faturamentoEstimado = 0;
    let lucroTotalEstimado = 0;
    let qtdPrejuizo = 0;
    let qtdAlerta = 0;
    let qtdSaudavel = 0;
    let somaMargens = 0;

    items.forEach(it => {
      const units = it.estoque > 0 ? it.estoque : 1;
      faturamentoEstimado += it.precoAtual * units;
      lucroTotalEstimado += it.lucroBruto * units;
      somaMargens += it.margemRealPercent;

      if (it.status === 'prejuizo') qtdPrejuizo++;
      else if (it.status === 'alerta') qtdAlerta++;
      else qtdSaudavel++;
    });

    return {
      totalAnuncios,
      faturamentoEstimado,
      lucroTotalEstimado,
      qtdPrejuizo,
      qtdAlerta,
      qtdSaudavel,
      margemMediaGeral: totalAnuncios > 0 ? somaMargens / totalAnuncios : 0
    };
  }, [items]);

  // 7. Filtragem, Busca e Ordenação
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Busca textual por SKU ou Título
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        it => it.sku.toLowerCase().includes(term) || it.titulo.toLowerCase().includes(term)
      );
    }

    // Filtro rápido de status
    if (statusFilter !== 'all') {
      result = result.filter(it => it.status === statusFilter);
    }

    // Ordenação
    if (sortField !== 'none') {
      result.sort((a, b) => {
        let diff = 0;
        if (sortField === 'sku') diff = a.sku.localeCompare(b.sku);
        else if (sortField === 'titulo') diff = a.titulo.localeCompare(b.titulo);
        else if (sortField === 'preco') diff = a.precoAtual - b.precoAtual;
        else if (sortField === 'custo') diff = a.custo - b.custo;
        else if (sortField === 'lucro') diff = a.lucroBruto - b.lucroBruto;
        else if (sortField === 'margem') diff = a.margemRealPercent - b.margemRealPercent;

        return sortDirection === 'asc' ? diff : -diff;
      });
    }

    return result;
  }, [items, searchTerm, statusFilter, sortField, sortDirection]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, currentPage, pageSize]);

  const toggleSort = (field: 'sku' | 'titulo' | 'preco' | 'custo' | 'lucro' | 'margem') => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortField('none');
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 8. Exportação: Excel (.xlsx)
  const exportToExcel = () => {
    if (filteredAndSortedItems.length === 0) return;

    const exportRows = filteredAndSortedItems.map(it => ({
      'SKU': it.sku,
      'Título': it.titulo,
      'Preço Atual (R$)': it.precoAtual,
      'Peso (kg)': it.pesoKg,
      'Tarifa (%)': it.tarifaVendaPercent,
      'Custo (R$)': it.custo,
      'Frete / Taxa ML (R$)': it.freteTaxaValor,
      'Comissão ML (R$)': it.comissaoValor,
      'Imposto (R$)': it.impostoValor,
      'Estoque': it.estoque,
      'Lucro Real (R$)': it.lucroBruto,
      'Margem Real (%)': it.margemRealPercent,
      'Preço Sugerido (R$)': it.precoSugerido,
      'Ponto de Equilíbrio (R$)': it.pontoEquilibrio,
      'Status':
        it.status === 'saudavel'
          ? 'Saudável'
          : it.status === 'alerta'
          ? 'Alerta'
          : 'Prejuízo'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conferência ML');
    XLSX.writeFile(wb, `Relatorio_Mercado_Livre_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 9. Exportação: CSV (.csv)
  const exportToCSV = () => {
    if (filteredAndSortedItems.length === 0) return;

    const exportRows = filteredAndSortedItems.map(it => ({
      'SKU': it.sku,
      'Título': it.titulo,
      'Preço Atual': it.precoAtual,
      'Peso (kg)': it.pesoKg,
      'Tarifa (%)': it.tarifaVendaPercent,
      'Custo': it.custo,
      'Frete ML': it.freteTaxaValor,
      'Comissão': it.comissaoValor,
      'Imposto': it.impostoValor,
      'Estoque': it.estoque,
      'Lucro Real': it.lucroBruto,
      'Margem Real (%)': it.margemRealPercent,
      'Preço Sugerido': it.precoSugerido,
      'Ponto de Equilíbrio': it.pontoEquilibrio,
      'Status': it.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Mercado_Livre_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 10. Exportação: PDF Executivo
  const exportToPDF = () => {
    if (filteredAndSortedItems.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    const now = new Date();

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Relatório de Conferência em Lote - Mercado Livre', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Precifica Fácil`,
      14,
      24
    );
    doc.text(
      `Alíquota Simples: ${simplesNacional}% | Margem Meta: ${margemMeta}% | Anúncios Analisados: ${items.length}`,
      14,
      29
    );

    const tableColumns = [
      'SKU',
      'Título',
      'Preço (R$)',
      'Peso',
      'Tarifa',
      'Custo (R$)',
      'Frete (R$)',
      'Lucro (R$)',
      'Margem %',
      'Preço Sugerido',
      'Ponto Equilíbrio',
      'Status'
    ];

    const tableRows = filteredAndSortedItems.map(it => [
      it.sku,
      it.titulo.length > 28 ? it.titulo.substring(0, 28) + '...' : it.titulo,
      formatCurrency(it.precoAtual),
      `${it.pesoKg}kg`,
      `${it.tarifaVendaPercent}%`,
      formatCurrency(it.custo),
      formatCurrency(it.freteTaxaValor),
      formatCurrency(it.lucroBruto),
      `${it.margemRealPercent.toFixed(1)}%`,
      formatCurrency(it.precoSugerido),
      formatCurrency(it.pontoEquilibrio),
      it.status === 'saudavel' ? 'Saudável' : it.status === 'alerta' ? 'Alerta' : 'Prejuízo'
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 34,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [234, 179, 8], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Relatorio_Mercado_Livre_${now.toISOString().split('T')[0]}.pdf`);
  };

  // Download de Modelos de Teste
  const downloadSampleML = () => {
    const wb = generateSampleMercadoLivreWorkbook();
    XLSX.writeFile(wb, 'Modelo_Exemplo_Anuncios_Mercado_Livre.xlsx');
  };

  const downloadSampleDePara = () => {
    const wb = generateSampleDeParaWorkbook();
    XLSX.writeFile(wb, 'Modelo_Exemplo_De_Para_Custos_SKU.xlsx');
  };

  // Helper de badges de status
  const renderStatusBadge = (status: MLBatchStatus) => {
    switch (status) {
      case 'saudavel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Saudável
          </span>
        );
      case 'alerta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Alerta
          </span>
        );
      case 'prejuizo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Prejuízo
          </span>
        );
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl mb-10 border-2 border-yellow-400 bg-white">
      {/* 1. Header do Módulo com Identidade Mercado Livre */}
      <div className="bg-gradient-to-r from-[#FFE600] via-[#FFDF00] to-[#F5D400] text-gray-900 p-6 sm:p-8 border-b border-yellow-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 text-[#FFE600] flex items-center justify-center shadow-lg font-black text-2xl shrink-0">
              ML
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-900">
                  Conferência em Lote - Mercado Livre
                </h2>
                <span className="bg-gray-900 text-yellow-300 text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-widest uppercase">
                  Regras 2026 Ativas
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800 mt-1 max-w-3xl">
                Auditoria completa de margens reais, frete oficial por peso e tarifa de comissão para centenas de anúncios simultaneamente.
              </p>
            </div>
          </div>

          {/* Modelos de download para facilitar o uso */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              onClick={downloadSampleML}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/80 hover:bg-white text-gray-900 px-3 py-2 rounded-xl border border-yellow-500 shadow-sm transition-all"
              title="Baixar planilha modelo de exemplo do Mercado Livre"
            >
              <Download className="w-3.5 h-3.5 text-gray-700" />
              <span>Modelo Planilha ML</span>
            </button>
            <button
              onClick={downloadSampleDePara}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/80 hover:bg-white text-gray-900 px-3 py-2 rounded-xl border border-yellow-500 shadow-sm transition-all"
              title="Baixar modelo exemplo de De-Para (SKU x Custo)"
            >
              <Download className="w-3.5 h-3.5 text-gray-700" />
              <span>Modelo De-Para</span>
            </button>
          </div>
        </div>

        {/* Badges de regras integradas */}
        <div className="mt-4 pt-4 border-t border-yellow-500/30 flex flex-wrap gap-2 text-[11px] font-bold text-gray-800">
          <span className="bg-white/60 px-3 py-1 rounded-lg">
            📦 Frete oficial por Peso (kg) e Faixa de Preço
          </span>
          <span className="bg-white/60 px-3 py-1 rounded-lg">
            ⚡ Diferenciação &lt; R$ 78,99 e ≥ R$ 79,00
          </span>
          <span className="bg-white/60 px-3 py-1 rounded-lg">
            🏷️ Suporte direto à coluna "Custo do Produto"
          </span>
          <span className="bg-white/60 px-3 py-1 rounded-lg">
            🎯 Ponto de Equilíbrio & Preço Mínimo Sugerido
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8 bg-gray-50/50">
        {/* 2. Área de Entrada de Dados (Upload e Cola) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-yellow-600" />
                1. Importação da Planilha de Anúncios
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Faça o upload da planilha (.xlsx ou .csv) contendo SKU, Título, Estoque, Preço, Tarifa, Peso e <strong>Custo do Produto</strong> (última coluna).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-[#FFE600] hover:bg-yellow-400 text-gray-900 text-xs font-black py-2.5 px-5 rounded-xl border border-yellow-500 transition-all shadow-md uppercase tracking-wider disabled:opacity-50"
              >
                <FileUp className="w-4 h-4 text-gray-900" />
                Importar Planilha ML (.xlsx / .csv)
              </button>
            </div>
          </div>

          {/* Área de texto opcional para colar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Ou cole os dados do Excel / CSV aqui:
              </label>
              {inputDataText && (
                <button
                  onClick={() => setInputDataText('')}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Limpar texto
                </button>
              )}
            </div>
            <textarea
              value={inputDataText}
              onChange={(e) => setInputDataText(e.target.value)}
              placeholder={`Exemplo copiado do Excel:\nSKU\tTítulo\tEstoque no depósito\tPreço\tTarifa de venda\tPeso físico (kg)\tCusto do Produto\nFONE-BT-01\tFone Bluetooth TWS\t35\t59.90\t14%\t0.25\t18.50\nSUPORTE-02\tSuporte Alumínio Notebook\t20\t89.90\t14%\t0.85\t29.00`}
              className="w-full h-28 p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent font-mono text-xs text-gray-800 placeholder-gray-400 shadow-inner"
            />
            {inputDataText.trim() && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleProcessTextData}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-yellow-300 text-xs font-black py-2 px-4 rounded-xl transition-all shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Processar Texto Colado
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Parâmetros e Ferramentas de Custo (Custo Global, De-Para, Impostos, Margem) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-5 h-5 text-yellow-600" />
                2. Definição de Custos e Metas de Margem
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Se a sua planilha já incluiu a coluna "Custo do Produto", os custos foram carregados automaticamente. Você também pode ajustar abaixo:
              </p>
            </div>
            {items.length > 0 && (
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {items.length} anúncios carregados
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Custo Global */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                  Custo Global Fixo (R$)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Aplica o mesmo custo a todos os anúncios de uma só vez.
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">R$</span>
                  <input
                    type="text"
                    value={globalCost}
                    onChange={(e) => setGlobalCost(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyGlobalCost()}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-black text-gray-800 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyGlobalCost}
                disabled={items.length === 0}
                className="mt-3 w-full bg-gray-900 hover:bg-gray-800 text-yellow-300 text-xs font-bold py-2 px-3 rounded-lg transition-all disabled:opacity-40"
              >
                Aplicar a Todos
              </button>
            </div>

            {/* De-Para por SKU */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                  Arquivo De-Para por SKU
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Importe planilha com colunas <strong>SKU</strong> e <strong>Custo</strong>.
                </p>
                <input
                  type="file"
                  ref={deParaInputRef}
                  onChange={handleDeParaUpload}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
              </div>
              <div className="mt-3">
                <button
                  onClick={() => deParaInputRef.current?.click()}
                  disabled={items.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#FFE600] hover:bg-yellow-400 text-gray-900 text-xs font-black py-2 px-3 rounded-lg border border-yellow-500 transition-all shadow-sm disabled:opacity-40"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-900" />
                  Carregar De-Para (.xlsx / .csv)
                </button>
                {deParaStatus && (
                  <p className="text-[10px] text-emerald-700 font-bold mt-1.5 text-center truncate" title={deParaStatus}>
                    ✓ {deParaStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Simples Nacional / Impostos (%) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                  Simples Nacional / Imposto (%)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Alíquota cobrada sobre a venda final.
                </p>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={simplesNacional}
                    onChange={(e) => handleParamsChange({ taxPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-black text-gray-800 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-500">%</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                Padrão das configurações gerais: {settings.simplesNacional}%
              </p>
            </div>

            {/* Margem Meta Desejada (%) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                  Margem Meta Desejada (%)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Meta para classificar anúncios saudáveis.
                </p>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="90"
                    value={margemMeta}
                    onChange={(e) => handleParamsChange({ targetMarginPercent: parseFloat(e.target.value) || 0 })}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-black text-gray-800 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-500">%</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-3">
                Padrão ML configurado: {settings.mercadoLivre.contributionMargin}%
              </p>
            </div>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm font-bold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold">{successMsg}</span>
          </div>
        )}

        {/* 4. Painel de Resultados (KPIs Globais) */}
        {items.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Total Anúncios */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Total de Anúncios
                </span>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
                  {kpiStats.totalAnuncios}
                </p>
                <span className="text-[10px] font-bold text-gray-400 mt-1">
                  {fileName ? fileName : 'Lote carregado'}
                </span>
              </div>

              {/* Faturamento Estimado */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Faturamento Estimado
                </span>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-2">
                  {formatCurrency(kpiStats.faturamentoEstimado)}
                </p>
                <span className="text-[10px] font-bold text-gray-400 mt-1">
                  Ponderado pelo estoque
                </span>
              </div>

              {/* Lucro Estimado */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                  Lucro Total Estimado
                </span>
                <p
                  className={`text-xl sm:text-2xl font-black mt-2 ${
                    kpiStats.lucroTotalEstimado >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(kpiStats.lucroTotalEstimado)}
                </p>
                <span className="text-[10px] font-bold text-gray-400 mt-1">
                  Margem Média: {kpiStats.margemMediaGeral.toFixed(1)}%
                </span>
              </div>

              {/* Saudáveis */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'saudavel' ? 'all' : 'saudavel')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  statusFilter === 'saudavel'
                    ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-300'
                    : 'bg-white border-gray-200 hover:border-emerald-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    🟢 Saudáveis
                  </span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                  {kpiStats.qtdSaudavel}
                </p>
                <span className="text-[10px] font-bold text-emerald-600/80 mt-1">
                  Margem ≥ {margemMeta}% ({((kpiStats.qtdSaudavel / kpiStats.totalAnuncios) * 100).toFixed(0)}%)
                </span>
              </div>

              {/* Prejuízo */}
              <div
                onClick={() => setStatusFilter(statusFilter === 'prejuizo' ? 'all' : 'prejuizo')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  statusFilter === 'prejuizo'
                    ? 'bg-rose-50 border-rose-400 shadow-md ring-2 ring-rose-300'
                    : 'bg-white border-gray-200 hover:border-rose-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                    🔴 Prejuízo
                  </span>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">
                  {kpiStats.qtdPrejuizo}
                </p>
                <span className="text-[10px] font-bold text-rose-600/80 mt-1">
                  Margem ≤ 0% ({((kpiStats.qtdPrejuizo / kpiStats.totalAnuncios) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Barra de Filtros, Busca e Exportação */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
              {/* Campo de Busca */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por SKU ou Título do anúncio..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>

              {/* Filtros Rápidos de Status */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
                    statusFilter === 'all'
                      ? 'bg-gray-900 text-yellow-300 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todos ({items.length})
                </button>
                <button
                  onClick={() => { setStatusFilter('prejuizo'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
                    statusFilter === 'prejuizo'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  🔴 Prejuízo ({kpiStats.qtdPrejuizo})
                </button>
                <button
                  onClick={() => { setStatusFilter('alerta'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
                    statusFilter === 'alerta'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  🟡 Alerta ({kpiStats.qtdAlerta})
                </button>
                <button
                  onClick={() => { setStatusFilter('saudavel'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${
                    statusFilter === 'saudavel'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  🟢 Saudável ({kpiStats.qtdSaudavel})
                </button>
              </div>

              {/* Botões de Exportação */}
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 px-3.5 rounded-xl shadow transition-all uppercase tracking-wider"
                  title="Exportar para Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white text-xs font-black py-2 px-3 rounded-xl shadow transition-all uppercase tracking-wider"
                  title="Exportar para CSV (.csv)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-2 px-3 rounded-xl shadow transition-all uppercase tracking-wider"
                  title="Exportar para PDF (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </button>
              </div>
            </div>

            {/* 5. Tabela Interativa de Anúncios */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span>
                    Exibindo <strong>{filteredAndSortedItems.length}</strong> de <strong>{items.length}</strong> anúncios
                  </span>
                  {statusFilter !== 'all' && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold">
                      Filtro: {statusFilter}
                    </span>
                  )}
                </div>

                {/* Seleção de tamanho de página */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <span>Itens por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100/80">
                    <tr>
                      <th
                        onClick={() => toggleSort('sku')}
                        className="px-3 py-3 text-left text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>SKU</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort('titulo')}
                        className="px-3 py-3 text-left text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Título do Anúncio</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort('preco')}
                        className="px-3 py-3 text-right text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Preço Atual</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th className="px-3 py-3 text-center text-[10px] font-black text-gray-600 uppercase tracking-wider">
                        Peso (kg)
                      </th>
                      <th className="px-3 py-3 text-center text-[10px] font-black text-gray-600 uppercase tracking-wider">
                        Tarifa (%)
                      </th>
                      <th
                        onClick={() => toggleSort('custo')}
                        className="px-3 py-3 text-right text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Custo (R$)</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-gray-600 uppercase tracking-wider">
                        Frete/Taxa ML
                      </th>
                      <th
                        onClick={() => toggleSort('lucro')}
                        className="px-3 py-3 text-right text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Lucro Real</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort('margem')}
                        className="px-3 py-3 text-right text-[10px] font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Margem Real</span>
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-blue-700 uppercase tracking-wider">
                        Preço Sugerido
                      </th>
                      <th className="px-3 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-wider">
                        Pto. Equilíbrio
                      </th>
                      <th className="px-3 py-3 text-center text-[10px] font-black text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedItems.map((item) => {
                      const isPrejuizo = item.status === 'prejuizo';
                      const isAlerta = item.status === 'alerta';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-yellow-50/40 transition-colors ${
                            isPrejuizo ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          {/* SKU */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-black text-gray-900 font-mono">
                            {item.sku}
                          </td>

                          {/* Título */}
                          <td
                            className="px-3 py-3 text-xs font-medium text-gray-700 max-w-xs truncate"
                            title={item.titulo}
                          >
                            {item.titulo}
                            {item.estoque > 0 && (
                              <span className="block text-[10px] text-gray-400 font-normal">
                                Estoque: {item.estoque} un.
                              </span>
                            )}
                          </td>

                          {/* Preço Atual */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-black text-right text-gray-900">
                            {formatCurrency(item.precoAtual)}
                          </td>

                          {/* Peso */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-center font-bold text-gray-600">
                            {item.pesoKg} kg
                          </td>

                          {/* Tarifa % */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-center font-bold text-gray-600">
                            {item.tarifaVendaPercent}%
                          </td>

                          {/* Custo Editável Inline */}
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <div className="inline-flex items-center justify-end">
                              <span className="text-[10px] text-gray-400 mr-1 font-bold">R$</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={item.custo === 0 ? '' : item.custo}
                                onChange={(e) => handleIndividualCostChange(item.id, e.target.value)}
                                placeholder="0,00"
                                className="w-20 px-2 py-1 text-right text-xs font-black text-gray-800 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                                title="Editar custo deste produto diretamente"
                              />
                            </div>
                          </td>

                          {/* Frete / Taxa ML */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-right font-medium text-gray-600">
                            {formatCurrency(item.freteTaxaValor)}
                          </td>

                          {/* Lucro Real */}
                          <td
                            className={`px-3 py-3 whitespace-nowrap text-xs text-right font-black ${
                              item.lucroBruto < 0
                                ? 'text-rose-600'
                                : item.lucroBruto === 0
                                ? 'text-gray-500'
                                : 'text-emerald-700'
                            }`}
                          >
                            {formatCurrency(item.lucroBruto)}
                          </td>

                          {/* Margem Real */}
                          <td
                            className={`px-3 py-3 whitespace-nowrap text-xs text-right font-black ${
                              isPrejuizo
                                ? 'text-rose-600'
                                : isAlerta
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {item.margemRealPercent.toFixed(2)}%
                          </td>

                          {/* Preço Mínimo / Sugerido */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-right font-black text-blue-700">
                            {item.precoSugerido > 0 ? formatCurrency(item.precoSugerido) : '---'}
                          </td>

                          {/* Ponto de Equilíbrio */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-right font-bold text-gray-500">
                            {item.pontoEquilibrio > 0 ? formatCurrency(item.pontoEquilibrio) : '---'}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            {renderStatusBadge(item.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (Total de {filteredAndSortedItems.length} itens filtrados)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      Anterior
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-black transition-colors ${
                            currentPage === pageNum
                              ? 'bg-gray-900 text-yellow-300'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

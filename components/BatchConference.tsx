import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppSettings } from '../types';
import { formatCurrency } from '../lib/calculator';
import {
  AuditedBatchItem,
  AuditBatchParams,
  BatchChannel,
  BlingProductRecord,
  MLListingType,
  MercadoLivreSheetRow,
  ShopeeCommonRow,
  auditMergedItem,
  generateBlingSampleWorkbook,
  generateMLSampleWorkbook,
  generateShopeeCommonSampleWorkbook,
  generateShopeePromoSampleWorkbook,
  mergeMarketplaceWithBling,
  parseBlingWorkbook,
  parseBrazilianNumber,
  parseMercadoLivreSheetWorkbook,
  parseShopeeCommonWorkbook,
  parseShopeePromoWorkbook,
} from '../lib/mergeMarketplaceData';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Layers,
  PackageX,
  Search,
  Sliders,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

interface BatchConferenceProps {
  settings: AppSettings;
}

type AuditFilter =
  | 'all'
  | 'sem_custo'
  | 'promocao'
  | 'prejuizo'
  | 'alerta'
  | 'saudavel';

type SortField = 'none' | 'sku' | 'titulo' | 'preco' | 'custo' | 'lucro' | 'margem';

export default function BatchConference({ settings }: BatchConferenceProps) {
  // Canal selecionado
  const [selectedChannel, setSelectedChannel] = useState<BatchChannel>('shopee');

  // Dados brutos carregados por planilha (mantidos independentes para re-cruzamento automático)
  const [blingData, setBlingData] = useState<{
    fileName: string;
    map: Map<string, BlingProductRecord>;
    totalRows: number;
  } | null>(null);

  const [shopeeCommonData, setShopeeCommonData] = useState<{
    fileName: string;
    rows: ShopeeCommonRow[];
  } | null>(null);

  const [shopeePromoData, setShopeePromoData] = useState<{
    fileName: string;
    promoMap: Map<string, number>;
    totalRows: number;
  } | null>(null);

  const [mlSheetData, setMlSheetData] = useState<{
    fileName: string;
    rows: MercadoLivreSheetRow[];
  } | null>(null);

  // Ajustes manuais pontuais de custo por linha (chave = skuNormalizado ou item.id)
  const [manualCostOverrides, setManualCostOverrides] = useState<Record<string, number>>({});
  const [costBuffers, setCostBuffers] = useState<Record<string, string>>({});

  // Parâmetros de cálculo editáveis (sincronizados com as configurações globais)
  const [taxPercent, setTaxPercent] = useState<number>(settings.simplesNacional);
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(
    settings.shopee.contributionMargin
  );
  const [mlListingType, setMlListingType] = useState<MLListingType>('classico');
  const [shopeeInCampaign, setShopeeInCampaign] = useState<boolean>(settings.shopee.inCampaign);

  useEffect(() => {
    setTaxPercent(settings.simplesNacional);
  }, [settings.simplesNacional]);

  useEffect(() => {
    setShopeeInCampaign(settings.shopee.inCampaign);
  }, [settings.shopee.inCampaign]);

  useEffect(() => {
    setTargetMarginPercent(
      selectedChannel === 'shopee'
        ? settings.shopee.contributionMargin
        : settings.mercadoLivre.contributionMargin
    );
  }, [
    selectedChannel,
    settings.shopee.contributionMargin,
    settings.mercadoLivre.contributionMargin,
  ]);

  // Filtros, ordenação e paginação
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Feedback
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Refs de arquivos
  const blingInputRef = useRef<HTMLInputElement>(null);
  const shopeeCommonInputRef = useRef<HTMLInputElement>(null);
  const shopeePromoInputRef = useRef<HTMLInputElement>(null);
  const mlInputRef = useRef<HTMLInputElement>(null);

  const showFeedbackSuccess = (msg: string) => {
    setErrorMsg('');
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const showFeedbackError = (msg: string) => {
    setSuccessMsg('');
    setErrorMsg(msg);
  };

  const readWorkbookFile = (file: File, onLoaded: (wb: XLSX.WorkBook) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        onLoaded(workbook);
      } catch (err) {
        console.error('Erro ao ler planilha:', err);
        showFeedbackError(
          `Não foi possível ler o arquivo "${file.name}". Verifique se é um .xlsx, .xls ou .csv válido.`
        );
      }
    };
    reader.onerror = () => {
      showFeedbackError(`Falha ao abrir o arquivo "${file.name}".`);
    };
    reader.readAsBinaryString(file);
  };

  // Upload 1: Planilha Base Bling
  const handleBlingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readWorkbookFile(file, (wb) => {
      const { blingMap, totalRows, errors } = parseBlingWorkbook(wb);
      if (totalRows === 0) {
        showFeedbackError(errors.join(' '));
      } else {
        setBlingData({ fileName: file.name, map: blingMap, totalRows });
        setCurrentPage(1);
        showFeedbackSuccess(
          `Base Bling "${file.name}" carregada com ${totalRows} SKUs (custo, estoque e peso bruto).`
        );
      }
      if (blingInputRef.current) blingInputRef.current.value = '';
    });
  };

  // Upload 2A: Preço Comum Shopee
  const handleShopeeCommonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readWorkbookFile(file, (wb) => {
      const { rows, errors } = parseShopeeCommonWorkbook(wb);
      if (rows.length === 0) {
        showFeedbackError(errors.join(' '));
      } else {
        setShopeeCommonData({ fileName: file.name, rows });
        setCurrentPage(1);
        showFeedbackSuccess(
          `Planilha de Preço Comum Shopee "${file.name}" carregada (${rows.length} anúncios).`
        );
      }
      if (shopeeCommonInputRef.current) shopeeCommonInputRef.current.value = '';
    });
  };

  // Upload 2B: Promoção Shopee (Opcional)
  const handleShopeePromoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readWorkbookFile(file, (wb) => {
      const { result, errors } = parseShopeePromoWorkbook(wb);
      if (result.totalRows === 0) {
        showFeedbackError(errors.join(' '));
      } else {
        setShopeePromoData({
          fileName: file.name,
          promoMap: result.promoMap,
          totalRows: result.totalRows,
        });
        setCurrentPage(1);
        showFeedbackSuccess(
          `Promoção Shopee "${file.name}" aplicada (${result.promoMap.size} SKUs com preço promocional).`
        );
      }
      if (shopeePromoInputRef.current) shopeePromoInputRef.current.value = '';
    });
  };

  // Upload 3: Planilha Única Mercado Livre
  const handleMLUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readWorkbookFile(file, (wb) => {
      const { rows, errors } = parseMercadoLivreSheetWorkbook(wb);
      if (rows.length === 0) {
        showFeedbackError(errors.join(' '));
      } else {
        setMlSheetData({ fileName: file.name, rows });
        setCurrentPage(1);
        showFeedbackSuccess(
          `Planilha Mercado Livre "${file.name}" carregada (${rows.length} anúncios).`
        );
      }
      if (mlInputRef.current) mlInputRef.current.value = '';
    });
  };

  // Carregar exemplo completo de acordo com o canal selecionado
  const handleLoadSample = () => {
    const blingWb = generateBlingSampleWorkbook();
    const { blingMap, totalRows } = parseBlingWorkbook(blingWb);
    setBlingData({ fileName: 'Exemplo_Base_Bling.xlsx', map: blingMap, totalRows });

    if (selectedChannel === 'shopee') {
      const commonWb = generateShopeeCommonSampleWorkbook();
      const promoWb = generateShopeePromoSampleWorkbook();
      const { rows } = parseShopeeCommonWorkbook(commonWb);
      const { result } = parseShopeePromoWorkbook(promoWb);
      setShopeeCommonData({ fileName: 'Exemplo_Shopee_Preco_Comum.xlsx', rows });
      setShopeePromoData({
        fileName: 'Exemplo_Shopee_Promocao.xlsx',
        promoMap: result.promoMap,
        totalRows: result.totalRows,
      });
      showFeedbackSuccess(
        'Exemplo Shopee + Bling carregado: 5 anúncios (2 em promoção e 1 alerta SEM_CUSTO_BLING).'
      );
    } else {
      const mlWb = generateMLSampleWorkbook();
      const { rows } = parseMercadoLivreSheetWorkbook(mlWb);
      setMlSheetData({ fileName: 'Exemplo_Mercado_Livre.xlsx', rows });
      showFeedbackSuccess(
        'Exemplo Mercado Livre + Bling carregado: 5 anúncios (2 em promoção, peso do Bling integrado e 1 alerta SEM_CUSTO_BLING).'
      );
    }
    setManualCostOverrides({});
    setCostBuffers({});
    setAuditFilter('all');
    setCurrentPage(1);
  };

  const fallbackWeightKg =
    settings.mercadoLivre.productWeight >= 0.001 ? settings.mercadoLivre.productWeight : 0.5;

  // Motor de Merge (Bling + Canal)
  const { mergedItems, mergeSummary } = useMemo(() => {
    const res = mergeMarketplaceWithBling({
      channel: selectedChannel,
      blingMap: blingData?.map ?? null,
      shopeeCommonRows: shopeeCommonData?.rows ?? [],
      shopeePromoMap: shopeePromoData?.promoMap ?? null,
      mlRows: mlSheetData?.rows ?? [],
      fallbackWeightKg,
    });
    return { mergedItems: res.items, mergeSummary: res.summary };
  }, [selectedChannel, blingData, shopeeCommonData, shopeePromoData, mlSheetData, fallbackWeightKg]);

  const auditParams: AuditBatchParams = useMemo(
    () => ({
      taxPercent,
      targetMarginPercent,
      mlListingType,
      mlClassicCommission: settings.mercadoLivre.classicCommission,
      mlPremiumCommission: settings.mercadoLivre.premiumCommission,
      fallbackWeightKg,
      shopeeInCampaign,
    }),
    [
      taxPercent,
      targetMarginPercent,
      mlListingType,
      settings.mercadoLivre.classicCommission,
      settings.mercadoLivre.premiumCommission,
      fallbackWeightKg,
      shopeeInCampaign,
    ]
  );

  // Conecta os itens cruzados ao motor de cálculo oficial do Precifica Fácil
  const auditedItems: AuditedBatchItem[] = useMemo(() => {
    return mergedItems.map((item) => {
      const overrideKey = item.skuNormalizado || item.id;
      const customCost = manualCostOverrides[overrideKey];
      const itemWithCost =
        customCost !== undefined ? { ...item, precoCusto: customCost } : item;
      return auditMergedItem(itemWithCost, settings, auditParams);
    });
  }, [mergedItems, manualCostOverrides, settings, auditParams]);

  // KPIs de auditoria
  const kpiStats = useMemo(() => {
    const total = auditedItems.length;
    const emPromocao = auditedItems.filter((i) => i.emPromocao).length;
    const semCustoBling = auditedItems.filter((i) => i.statusCruzamento === 'SEM_CUSTO_BLING').length;
    const prejuizo = auditedItems.filter((i) => i.statusMargem === 'prejuizo').length;
    const alerta = auditedItems.filter((i) => i.statusMargem === 'alerta').length;
    const saudavel = auditedItems.filter((i) => i.statusMargem === 'saudavel').length;
    const margemMedia =
      total > 0 ? auditedItems.reduce((acc, it) => acc + it.margemRealPercent, 0) / total : 0;

    return { total, emPromocao, semCustoBling, prejuizo, alerta, saudavel, margemMedia };
  }, [auditedItems]);

  // Filtragem e ordenação
  const filteredAndSortedItems = useMemo(() => {
    let list = [...auditedItems];

    if (auditFilter === 'sem_custo') {
      list = list.filter((i) => i.statusCruzamento === 'SEM_CUSTO_BLING');
    } else if (auditFilter === 'promocao') {
      list = list.filter((i) => i.emPromocao);
    } else if (auditFilter === 'prejuizo') {
      list = list.filter((i) => i.statusMargem === 'prejuizo');
    } else if (auditFilter === 'alerta') {
      list = list.filter((i) => i.statusMargem === 'alerta');
    } else if (auditFilter === 'saudavel') {
      list = list.filter((i) => i.statusMargem === 'saudavel');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (i) => i.sku.toLowerCase().includes(q) || i.titulo.toLowerCase().includes(q)
      );
    }

    if (sortField !== 'none') {
      list.sort((a, b) => {
        let diff = 0;
        if (sortField === 'sku') diff = a.sku.localeCompare(b.sku);
        else if (sortField === 'titulo') diff = a.titulo.localeCompare(b.titulo);
        else if (sortField === 'preco') diff = a.precoFinalVenda - b.precoFinalVenda;
        else if (sortField === 'custo') diff = a.precoCusto - b.precoCusto;
        else if (sortField === 'lucro') diff = a.lucroBruto - b.lucroBruto;
        else if (sortField === 'margem') diff = a.margemRealPercent - b.margemRealPercent;
        return sortDirection === 'asc' ? diff : -diff;
      });
    }

    return list;
  }, [auditedItems, auditFilter, searchTerm, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, currentPage, pageSize]);

  const toggleSort = (field: Exclude<SortField, 'none'>) => {
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

  // Edição pontual de custo na tabela (útil para corrigir SKU SEM_CUSTO_BLING)
  const getCostInputValue = (item: AuditedBatchItem): string => {
    const key = item.skuNormalizado || item.id;
    if (costBuffers[key] !== undefined) return costBuffers[key];
    return item.precoCusto > 0 ? item.precoCusto.toFixed(2).replace('.', ',') : '';
  };

  const handleCostChange = (item: AuditedBatchItem, val: string) => {
    const key = item.skuNormalizado || item.id;
    setCostBuffers((prev) => ({ ...prev, [key]: val }));
    const parsed = Math.max(0, parseBrazilianNumber(val));
    setManualCostOverrides((prev) => ({ ...prev, [key]: parsed }));
  };

  // Exportações (XLSX, CSV e PDF)
  const handleExportExcel = () => {
    if (filteredAndSortedItems.length === 0) return;
    const rows = filteredAndSortedItems.map((it) => ({
      SKU: it.sku,
      'Produto / Anúncio': it.titulo,
      Canal: it.channel === 'shopee' ? 'Shopee' : 'Mercado Livre',
      'Status Cruzamento': it.statusCruzamento,
      'Em Promoção': it.emPromocao ? 'Sim' : 'Não',
      'Preço Comum (R$)': it.precoComum,
      'Preço Promoção (R$)': it.emPromocao ? it.precoPromocao : '',
      'Preço Final Venda (R$)': it.precoFinalVenda,
      'Custo Bling (R$)': it.precoCusto,
      'Estoque Físico': it.estoqueFisico,
      'Peso Bruto (kg)': it.pesoBruto,
      'Comissão (%)': it.comissaoPercent,
      'Comissão (R$)': it.comissaoValor,
      'Taxa Fixa / Frete (R$)': it.freteTaxaValor,
      'Simples Nacional (R$)': it.impostoValor,
      'Lucro Bruto (R$)': it.lucroBruto,
      'Margem Real (%)': it.margemRealPercent,
      'Preço Sugerido Meta (R$)': it.precoSugerido,
      'Ponto de Equilíbrio (R$)': it.pontoEquilibrio,
      'Status Margem':
        it.statusMargem === 'saudavel'
          ? 'Saudável'
          : it.statusMargem === 'alerta'
          ? 'Abaixo da Meta'
          : 'Prejuízo',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria Lote');
    const channelSlug = selectedChannel === 'shopee' ? 'Shopee' : 'Mercado_Livre';
    XLSX.writeFile(
      wb,
      `Auditoria_Lote_${channelSlug}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportCSV = () => {
    if (filteredAndSortedItems.length === 0) return;
    const rows = filteredAndSortedItems.map((it) => ({
      SKU: it.sku,
      Titulo: it.titulo,
      Status_Cruzamento: it.statusCruzamento,
      Em_Promocao: it.emPromocao ? 'Sim' : 'Nao',
      Preco_Comum: it.precoComum,
      Preco_Final_Venda: it.precoFinalVenda,
      Custo_Bling: it.precoCusto,
      Estoque_Fisico: it.estoqueFisico,
      Peso_Bruto_kg: it.pesoBruto,
      Comissao_Valor: it.comissaoValor,
      Frete_Taxa: it.freteTaxaValor,
      Imposto: it.impostoValor,
      Lucro_Bruto: it.lucroBruto,
      Margem_Real_Pct: it.margemRealPercent,
      Preco_Sugerido: it.precoSugerido,
      Ponto_Equilibrio: it.pontoEquilibrio,
      Status_Margem: it.statusMargem,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_Lote_${selectedChannel}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filteredAndSortedItems.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const now = new Date();
    const channelLabel = selectedChannel === 'shopee' ? 'Shopee' : 'Mercado Livre';

    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(`Conferência em Lote (${channelLabel}) - Precifica Fácil`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })} | Simples: ${taxPercent}% | Margem Meta: ${targetMarginPercent}% | Itens: ${
        filteredAndSortedItems.length
      }`,
      14,
      25
    );

    const head = [
      [
        'SKU',
        'Produto',
        'Cruzamento',
        'Preço Final',
        'Promo',
        'Custo Bling',
        'Peso (kg)',
        'Comissão',
        'Frete/Taxa',
        'Lucro',
        'Margem %',
        'Sugerido',
        'Status',
      ],
    ];
    const body = filteredAndSortedItems.map((it) => [
      it.sku,
      it.titulo.length > 26 ? `${it.titulo.slice(0, 26)}...` : it.titulo,
      it.statusCruzamento,
      formatCurrency(it.precoFinalVenda),
      it.emPromocao ? 'Sim' : 'Não',
      formatCurrency(it.precoCusto),
      `${it.pesoBruto.toFixed(3)}`,
      formatCurrency(it.comissaoValor),
      formatCurrency(it.freteTaxaValor),
      formatCurrency(it.lucroBruto),
      `${it.margemRealPercent.toFixed(1)}%`,
      formatCurrency(it.precoSugerido),
      it.statusMargem === 'saudavel'
        ? 'Saudável'
        : it.statusMargem === 'alerta'
        ? 'Alerta'
        : 'Prejuízo',
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    });

    doc.save(`Auditoria_Lote_${selectedChannel}_${now.toISOString().split('T')[0]}.pdf`);
  };

  const handleDownloadTemplates = () => {
    XLSX.writeFile(generateBlingSampleWorkbook(), 'Modelo_Base_Bling.xlsx');
    if (selectedChannel === 'shopee') {
      XLSX.writeFile(generateShopeeCommonSampleWorkbook(), 'Modelo_Shopee_Preco_Comum.xlsx');
      XLSX.writeFile(generateShopeePromoSampleWorkbook(), 'Modelo_Shopee_Promocao.xlsx');
    } else {
      XLSX.writeFile(generateMLSampleWorkbook(), 'Modelo_Mercado_Livre.xlsx');
    }
  };

  const handleClearChannelFiles = () => {
    if (selectedChannel === 'shopee') {
      setShopeeCommonData(null);
      setShopeePromoData(null);
    } else {
      setMlSheetData(null);
    }
    setManualCostOverrides({});
    setCostBuffers({});
    setAuditFilter('all');
    setCurrentPage(1);
  };

  const isShopee = selectedChannel === 'shopee';

  return (
    <section
      id="conferencia-em-lote"
      className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 overflow-hidden"
    >
      {/* Cabeçalho e Seletor de Canal */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Conferência em Lote — Auditoria de Preços e Margens
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Cruzamento automático por SKU entre a base do Bling e suas planilhas da Shopee ou
            Mercado Livre, sem PROCV manual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Seletor claro entre Shopee e Mercado Livre */}
          <div
            role="tablist"
            aria-label="Selecionar canal para conferência em lote"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isShopee}
              onClick={() => {
                setSelectedChannel('shopee');
                setAuditFilter('all');
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isShopee
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#EE4D2D] shrink-0" />
              <span>Shopee</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isShopee}
              onClick={() => {
                setSelectedChannel('mercadolivre');
                setAuditFilter('all');
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                !isShopee
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 ring-1 ring-yellow-500/40 shrink-0" />
              <span>Mercado Livre</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplates}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            title="Baixar planilhas modelo com as colunas exatas"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Modelos (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Carregar Exemplo</span>
          </button>
        </div>
      </div>

      {/* Área de Upload Multi-Planilhas + Parâmetros do Motor */}
      <div className="p-6 space-y-6 bg-slate-50/50 border-b border-slate-200">
        <div
          className={`grid grid-cols-1 gap-4 ${
            isShopee ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
          }`}
        >
          {/* 1. Base Bling (Sempre visível) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Base Bling (Obrigatória)
                </span>
                {blingData ? (
                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                    {blingData.totalRows} SKUs
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Aguardando arquivo</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Colunas: <strong>Código (SKU)</strong>, Descrição, Preço de custo, Estoque físico e{' '}
                <strong>Peso bruto</strong> (kg).
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                ref={blingInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleBlingUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => blingInputRef.current?.click()}
                className={`flex-1 h-10 inline-flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  blingData
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                }`}
              >
                <FileUp className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {blingData ? blingData.fileName : 'Enviar Planilha Bling'}
                </span>
              </button>
              {blingData && (
                <button
                  type="button"
                  onClick={() => setBlingData(null)}
                  aria-label="Remover planilha do Bling"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Uploads específicos do canal selecionado */}
          {isShopee ? (
            <>
              {/* Shopee Preço Comum */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EE4D2D] shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        2. Preço Comum Shopee
                      </span>
                    </div>
                    {shopeeCommonData ? (
                      <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                        {shopeeCommonData.rows.length} itens
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Obrigatória</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Colunas: <strong>SKU de referência</strong>, Nome do Produto e{' '}
                    <strong>Preço</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={shopeeCommonInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleShopeeCommonUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => shopeeCommonInputRef.current?.click()}
                    className={`flex-1 h-10 inline-flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      shopeeCommonData
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#EE4D2D] text-white border-[#EE4D2D] hover:bg-[#d64123]'
                    }`}
                  >
                    <FileUp className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {shopeeCommonData ? shopeeCommonData.fileName : 'Enviar Preço Comum'}
                    </span>
                  </button>
                  {shopeeCommonData && (
                    <button
                      type="button"
                      onClick={() => setShopeeCommonData(null)}
                      aria-label="Remover planilha de Preço Comum Shopee"
                      className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Shopee Promoção (Opcional) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#EE4D2D] shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        3. Promoção Shopee (Opcional)
                      </span>
                    </div>
                    {shopeePromoData ? (
                      <span className="text-xs font-semibold text-blue-700 tabular-nums">
                        {shopeePromoData.promoMap.size} em promo
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Opcional</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Colunas: <strong>Nº de Ref. SKU</strong> (ou Parent SKU) e{' '}
                    <strong>Preço de desconto</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={shopeePromoInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleShopeePromoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => shopeePromoInputRef.current?.click()}
                    className={`flex-1 h-10 inline-flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      shopeePromoData
                        ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Tag className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {shopeePromoData ? shopeePromoData.fileName : 'Enviar Promoção Shopee'}
                    </span>
                  </button>
                  {shopeePromoData && (
                    <button
                      type="button"
                      onClick={() => setShopeePromoData(null)}
                      aria-label="Remover planilha de Promoção Shopee"
                      className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Mercado Livre Arquivo Único */
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 ring-1 ring-yellow-500/40 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      2. Planilha do Mercado Livre
                    </span>
                  </div>
                  {mlSheetData ? (
                    <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                      {mlSheetData.rows.length} anúncios
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Arquivo único</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Colunas: <strong>SKU</strong>, Título, <strong>Preço</strong> e{' '}
                  <strong>Preço em promoção</strong>. Frete calculado pelo Peso bruto do Bling.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={mlInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleMLUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mlInputRef.current?.click()}
                  className={`flex-1 h-10 inline-flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                    mlSheetData
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-[#FFE600] text-slate-900 border-yellow-500 hover:bg-yellow-400'
                  }`}
                >
                  <FileUp className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {mlSheetData ? mlSheetData.fileName : 'Enviar Planilha Mercado Livre'}
                  </span>
                </button>
                {mlSheetData && (
                  <button
                    type="button"
                    onClick={() => setMlSheetData(null)}
                    aria-label="Remover planilha do Mercado Livre"
                    className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Parâmetros do Motor (Simples Nacional, Margem Meta e Regra do Canal) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2 self-center">
            <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Parâmetros de Auditoria
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Simples Nacional (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 h-9 px-2.5 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Margem Meta (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="85"
                value={targetMarginPercent}
                onChange={(e) =>
                  setTargetMarginPercent(Math.max(0, parseFloat(e.target.value) || 0))
                }
                className="w-24 h-9 px-2.5 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isShopee ? (
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-600 mb-1">
                  Regras Shopee Ativas
                </span>
                <label className="inline-flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={shopeeInCampaign}
                    onChange={(e) => setShopeeInCampaign(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Campanha Destaque (+2,5%)</span>
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Exposição Padrão ML
                </label>
                <select
                  value={mlListingType}
                  onChange={(e) => setMlListingType(e.target.value as MLListingType)}
                  className="h-9 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="classico">
                    Clássico ({settings.mercadoLivre.classicCommission}%)
                  </option>
                  <option value="premium">
                    Premium ({settings.mercadoLivre.premiumCommission}%)
                  </option>
                </select>
              </div>
            )}

            <div className="text-xs text-slate-500 self-end pb-1.5">
              {isShopee ? (
                <span>
                  Regra {settings.shopee.sellerType.toUpperCase()} · Taxa fixa R$ 4,50 (≤ R$ 79,99)
                </span>
              ) : (
                <span>Tabela oficial ML 2026 (Peso bruto Bling + faixa de preço)</span>
              )}
            </div>
          </div>
        </div>

        {/* Alertas / Feedback */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {auditedItems.length > 0 && !blingData && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Planilha do Bling ainda não carregada — todos os itens estão sinalizados como{' '}
              <strong>SEM_CUSTO_BLING</strong>. Envie a Base Bling acima para cruzar custo,
              estoque e peso bruto automaticamente.
            </span>
          </div>
        )}
      </div>

      {/* Resumo Rápido + Tabela Auditada */}
      {auditedItems.length > 0 ? (
        <div className="p-6 space-y-5">
          {/* Resumo Rápido Pós-Cruzamento */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              type="button"
              onClick={() => {
                setAuditFilter('all');
                setCurrentPage(1);
              }}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                auditFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  auditFilter === 'all' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Anúncios Lidos
              </span>
              <p className="text-2xl font-bold mt-1 tabular-nums">{mergeSummary.totalAnuncios}</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditFilter(auditFilter === 'promocao' ? 'all' : 'promocao');
                setCurrentPage(1);
              }}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                auditFilter === 'promocao'
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                Em Promoção
              </span>
              <p className="text-2xl font-bold text-blue-700 mt-1 tabular-nums">
                {kpiStats.emPromocao}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditFilter(auditFilter === 'sem_custo' ? 'all' : 'sem_custo');
                setCurrentPage(1);
              }}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                auditFilter === 'sem_custo'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                SEM_CUSTO_BLING
              </span>
              <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                {kpiStats.semCustoBling}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditFilter(auditFilter === 'prejuizo' ? 'all' : 'prejuizo');
                setCurrentPage(1);
              }}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                auditFilter === 'prejuizo'
                  ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
                Prejuízo (≤ 0%)
              </span>
              <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">
                {kpiStats.prejuizo}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditFilter(auditFilter === 'alerta' ? 'all' : 'alerta');
                setCurrentPage(1);
              }}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                auditFilter === 'alerta'
                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Abaixo da Meta
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
                {kpiStats.alerta}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuditFilter(auditFilter === 'saudavel' ? 'all' : 'saudavel');
                setCurrentPage(1);
              }}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                auditFilter === 'saudavel'
                  ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Saudáveis (≥ {targetMarginPercent}%)
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
                {kpiStats.saudavel}
              </p>
            </button>
          </div>

          {/* Barra de Busca, Paginação e Exportação */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[230px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por SKU ou nome do produto..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 tabular-nums mr-1">
                Exibindo <strong>{filteredAndSortedItems.length}</strong> de{' '}
                <strong>{auditedItems.length}</strong> · Margem média:{' '}
                <strong>{kpiStats.margemMedia.toFixed(1)}%</strong>
              </span>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                CSV
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>

              <button
                type="button"
                onClick={handleClearChannelFiles}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                title="Limpar planilhas do canal atual"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Canal
              </button>
            </div>
          </div>

          {/* Tabela Auditada */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th
                      onClick={() => toggleSort('sku')}
                      className="py-3 pl-4 pr-3 cursor-pointer hover:text-slate-800"
                    >
                      <span className="inline-flex items-center gap-1">
                        SKU <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleSort('titulo')}
                      className="py-3 px-3 cursor-pointer hover:text-slate-800"
                    >
                      <span className="inline-flex items-center gap-1">
                        Produto / Cruzamento <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleSort('custo')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-slate-800"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Custo Bling <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleSort('preco')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-slate-800"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Preço Final <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right">Comissão &amp; Frete/Taxa</th>
                    <th className="py-3 px-3 text-right">Imposto</th>
                    <th
                      onClick={() => toggleSort('lucro')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-slate-800"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Lucro Bruto <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th
                      onClick={() => toggleSort('margem')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-slate-800"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Margem Real <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="py-3 px-3 text-right">Sugerido / Piso</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 pl-2 pr-4 w-10 text-right">
                      <span className="sr-only">Detalhes</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedItems.map((item) => {
                    const isExpanded = !!expandedRows[item.id];
                    const missingBling = item.statusCruzamento === 'SEM_CUSTO_BLING';

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`transition-colors ${
                            missingBling
                              ? 'bg-amber-50/60 hover:bg-amber-50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* SKU */}
                          <td className="py-3 pl-4 pr-3 align-middle whitespace-nowrap">
                            <span className="text-xs font-mono font-bold text-slate-900">
                              {item.sku}
                            </span>
                            {item.emPromocao && (
                              <span className="block text-[10px] font-semibold text-blue-700 mt-0.5">
                                Em Promoção
                              </span>
                            )}
                          </td>

                          {/* Título + Metadados Bling */}
                          <td className="py-3 px-3 align-middle max-w-[270px]">
                            <p
                              className="text-xs font-semibold text-slate-900 truncate"
                              title={item.titulo}
                            >
                              {item.titulo}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 tabular-nums">
                              {missingBling ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                                  <PackageX className="w-3 h-3 shrink-0" />
                                  SEM_CUSTO_BLING
                                </span>
                              ) : (
                                <>
                                  <span>Estoque: {item.estoqueFisico}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Peso:{' '}
                                    {item.pesoBruto >= 0.001
                                      ? `${item.pesoBruto.toFixed(3)} kg`
                                      : `padrão (${item.pesoCalculoUsado} kg)`}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Custo Bling (editável caso falte no Bling ou precise ajuste) */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="text-[10px] text-slate-400">R$</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getCostInputValue(item)}
                                onChange={(e) => handleCostChange(item, e.target.value)}
                                placeholder="0,00"
                                aria-label={`Custo do SKU ${item.sku}`}
                                className={`w-20 h-7 px-2 text-right text-xs font-semibold rounded border focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  missingBling && item.precoCusto === 0
                                    ? 'bg-white border-amber-400 text-amber-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Preço Final Venda (Promo vs Comum) */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <div className="text-sm font-bold text-blue-600">
                              {formatCurrency(item.precoFinalVenda)}
                            </div>
                            {item.emPromocao && item.precoComum > 0 && (
                              <div className="text-[11px] text-slate-400 line-through">
                                Comum: {formatCurrency(item.precoComum)}
                              </div>
                            )}
                          </td>

                          {/* Comissão & Frete/Taxa */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <div className="text-xs font-medium text-slate-700">
                              {formatCurrency(item.comissaoValor)}{' '}
                              <span className="text-slate-400">({item.comissaoPercent}%)</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {isShopee ? 'Taxa:' : 'Frete:'} {formatCurrency(item.freteTaxaValor)}
                            </div>
                          </td>

                          {/* Imposto Simples */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <div className="text-xs font-medium text-slate-700">
                              {formatCurrency(item.impostoValor)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.impostoPercent.toFixed(1)}%
                            </div>
                          </td>

                          {/* Lucro Bruto */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <span
                              className={`text-sm font-semibold ${
                                item.lucroBruto <= 0 ? 'text-red-600' : 'text-emerald-600'
                              }`}
                            >
                              {formatCurrency(item.lucroBruto)}
                            </span>
                          </td>

                          {/* Margem Real (%) */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <span
                              className={`text-sm font-bold ${
                                item.statusMargem === 'prejuizo'
                                  ? 'text-red-600'
                                  : item.statusMargem === 'alerta'
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {item.margemRealPercent.toFixed(2)}%
                            </span>
                          </td>

                          {/* Sugerido / Ponto de Equilíbrio */}
                          <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                            <div className="text-xs font-semibold text-slate-900">
                              {item.precoSugerido > 0 ? formatCurrency(item.precoSugerido) : '---'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Piso: {item.pontoEquilibrio > 0 ? formatCurrency(item.pontoEquilibrio) : '---'}
                            </div>
                          </td>

                          {/* Status Cruzamento + Margem */}
                          <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                            {missingBling ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Sem Custo</span>
                              </span>
                            ) : item.statusMargem === 'prejuizo' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Prejuízo</span>
                              </span>
                            ) : item.statusMargem === 'alerta' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Abaixo Meta</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Saudável</span>
                              </span>
                            )}
                          </td>

                          {/* Expandir Detalhes */}
                          <td className="py-3 pl-2 pr-4 text-right align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [item.id]: !prev[item.id],
                                }))
                              }
                              aria-expanded={isExpanded}
                              aria-label={`Ver detalhes do SKU ${item.sku}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-blue-600' : ''
                                }`}
                              />
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={11} className="px-4 py-3.5 border-t border-slate-100">
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs tabular-nums">
                                <div>
                                  <span className="block text-[11px] text-slate-500">
                                    Status do Cruzamento
                                  </span>
                                  <span className="font-semibold text-slate-900 mt-0.5 block">
                                    {item.statusCruzamento}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-slate-500">
                                    Preço Comum / Promoção
                                  </span>
                                  <span className="font-semibold text-slate-900 mt-0.5 block">
                                    {formatCurrency(item.precoComum)} /{' '}
                                    {item.emPromocao ? formatCurrency(item.precoPromocao) : 'Sem promo'}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-slate-500">
                                    Peso Bruto (Bling)
                                  </span>
                                  <span className="font-semibold text-slate-900 mt-0.5 block">
                                    {item.pesoBruto > 0
                                      ? `${item.pesoBruto.toFixed(3)} kg`
                                      : `Não informado (cálculo ${item.pesoCalculoUsado} kg)`}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-slate-500">
                                    Estoque Físico (Bling)
                                  </span>
                                  <span className="font-semibold text-slate-900 mt-0.5 block">
                                    {item.estoqueFisico} un.
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-slate-500">
                                    Ponto de Equilíbrio (0%)
                                  </span>
                                  <span className="font-semibold text-slate-900 mt-0.5 block">
                                    {item.pontoEquilibrio > 0
                                      ? formatCurrency(item.pontoEquilibrio)
                                      : '---'}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[11px] text-slate-500">
                                    Preço Sugerido (Meta {targetMarginPercent}%)
                                  </span>
                                  <span className="font-semibold text-blue-700 mt-0.5 block">
                                    {item.precoSugerido > 0
                                      ? formatCurrency(item.precoSugerido)
                                      : '---'}
                                  </span>
                                </div>
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

            {filteredAndSortedItems.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                Nenhum anúncio encontrado para os filtros aplicados.
              </div>
            )}

            {/* Paginação */}
            {filteredAndSortedItems.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Itens por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 px-2 bg-white border border-slate-300 rounded-md font-semibold text-slate-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 tabular-nums">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold disabled:opacity-40 hover:bg-slate-100"
                  >
                    Anterior
                  </button>
                  <span>
                    Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-semibold disabled:opacity-40 hover:bg-slate-100"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Envie suas planilhas para cruzar e auditar automaticamente
            </h3>
            <p className="text-xs text-slate-500">
              {isShopee
                ? 'Carregue a Base do Bling, o arquivo de Preço Comum da Shopee e opcionalmente a planilha de Promoção Shopee. O sistema faz o cruzamento por SKU automaticamente.'
                : 'Carregue a Base do Bling e a planilha do Mercado Livre. O sistema cruza o SKU, resolve preços promocionais e aplica o Peso bruto do Bling na tabela de frete do ML.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Carregar Exemplo ({isShopee ? 'Shopee + Bling' : 'Mercado Livre + Bling'})
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplates}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar Planilhas Modelo (.xlsx)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

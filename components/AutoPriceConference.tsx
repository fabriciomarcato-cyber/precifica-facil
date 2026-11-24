import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { AppSettings } from '../types';
import { formatCurrency, formatPercentage, parseNumber, parseWeight } from '../lib/calculator';
import {
  AutoPriceAuditedItem,
  AutoPriceChannel,
  AutoPriceRawItem,
  AutoPriceStatus,
  ChannelSyncConfigs,
  auditAutoPriceItem,
  generateSampleAutoPriceWorkbook,
  getChannelDisplayName,
  mergeAutoPriceRows,
  normalizeChannelString,
  parseAutoPriceWorkbook,
} from '../lib/autoPriceConference';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Filter,
  GitCompare,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react';

interface AutoPriceConferenceProps {
  settings: AppSettings;
}

const STORAGE_ITEMS_KEY = 'precificaFacilAutoPriceItems';
const STORAGE_SYNC_KEY = 'precificaFacilAutoPriceSyncEndpoints';

type StatusFilter = 'all' | 'attention' | AutoPriceStatus;
type ChannelFilter = 'all' | 'ml' | 'shopee' | 'tiktok';

const getChannelDotClass = (channel: AutoPriceChannel): string => {
  switch (channel) {
    case 'ml_classico':
    case 'ml_premium':
      return 'bg-yellow-400 ring-1 ring-yellow-500/40';
    case 'shopee':
      return 'bg-[#EE4D2D]';
    case 'tiktok':
      return 'bg-neutral-900';
  }
};

const getStatusMeta = (status: AutoPriceStatus) => {
  switch (status) {
    case 'prejuizo':
      return {
        label: 'Prejuízo / Abaixo do Piso',
        shortLabel: 'Prejuízo / Piso',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        Icon: AlertCircle,
      };
    case 'margem_baixa':
      return {
        label: 'Margem Baixa',
        shortLabel: 'Margem Baixa',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        Icon: AlertTriangle,
      };
    case 'divergencia':
      return {
        label: 'Divergência de Preço',
        shortLabel: 'Divergência',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        Icon: GitCompare,
      };
    case 'ok':
      return {
        label: 'OK',
        shortLabel: 'OK',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Icon: CheckCircle2,
      };
  }
};

export default function AutoPriceConference({ settings }: AutoPriceConferenceProps) {
  // Raw catalog items persisted locally
  const [rawItems, setRawItems] = useState<AutoPriceRawItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_ITEMS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Channel API sync config (endpoint URLs persisted, auth tokens kept strictly in memory)
  const [syncConfigs, setSyncConfigs] = useState<ChannelSyncConfigs>(() => {
    const fallback: ChannelSyncConfigs = {
      ml: { endpointUrl: '', authToken: '' },
      shopee: { endpointUrl: '', authToken: '' },
      tiktok: { endpointUrl: '', authToken: '' },
    };
    try {
      const saved = window.localStorage.getItem(STORAGE_SYNC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ml: { endpointUrl: parsed?.ml?.endpointUrl || '', authToken: '', lastSyncAt: parsed?.ml?.lastSyncAt },
          shopee: { endpointUrl: parsed?.shopee?.endpointUrl || '', authToken: '', lastSyncAt: parsed?.shopee?.lastSyncAt },
          tiktok: { endpointUrl: parsed?.tiktok?.endpointUrl || '', authToken: '', lastSyncAt: parsed?.tiktok?.lastSyncAt },
        };
      }
    } catch {
      // ignore
    }
    return fallback;
  });

  // Persist raw items
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(rawItems));
    } catch {
      // ignore
    }
  }, [rawItems]);

  // Persist non-sensitive endpoint URLs & timestamps
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_SYNC_KEY,
        JSON.stringify({
          ml: { endpointUrl: syncConfigs.ml.endpointUrl, lastSyncAt: syncConfigs.ml.lastSyncAt },
          shopee: { endpointUrl: syncConfigs.shopee.endpointUrl, lastSyncAt: syncConfigs.shopee.lastSyncAt },
          tiktok: { endpointUrl: syncConfigs.tiktok.endpointUrl, lastSyncAt: syncConfigs.tiktok.lastSyncAt },
        })
      );
    } catch {
      // ignore
    }
  }, [syncConfigs]);

  // Margin & divergence parameters
  const [mlMinMargin, setMlMinMargin] = useState<number>(settings.mercadoLivre.contributionMargin);
  const [shopeeMinMargin, setShopeeMinMargin] = useState<number>(settings.shopee.contributionMargin);
  const [tiktokMinMargin, setTiktokMinMargin] = useState<number>(settings.tiktok.contributionMargin);
  const [divergenceTolerance, setDivergenceTolerance] = useState<number>(5);

  useEffect(() => {
    setMlMinMargin(settings.mercadoLivre.contributionMargin);
    setShopeeMinMargin(settings.shopee.contributionMargin);
    setTiktokMinMargin(settings.tiktok.contributionMargin);
  }, [
    settings.mercadoLivre.contributionMargin,
    settings.shopee.contributionMargin,
    settings.tiktok.contributionMargin,
  ]);

  // UI panels & filters
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [defaultImportChannel, setDefaultImportChannel] = useState<AutoPriceChannel>('ml_classico');
  const [showApiPanel, setShowApiPanel] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [syncingChannel, setSyncingChannel] = useState<'ml' | 'shopee' | 'tiktok' | 'all' | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // String edit buffers for inline weight/cost/price so decimal typing (comma or dot) never fights cursor
  const [editBuffers, setEditBuffers] = useState<Record<string, string>>({});

  const [feedbackError, setFeedbackError] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string>('');

  // Add manual item state
  const [newItemForm, setNewItemForm] = useState({
    sku: '',
    marketplaceId: '',
    channel: 'ml_classico' as AutoPriceChannel,
    title: '',
    cost: '',
    weight: '0,500',
    currentPrice: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawItemsRef = useRef<AutoPriceRawItem[]>(rawItems);
  useEffect(() => {
    rawItemsRef.current = rawItems;
  }, [rawItems]);

  const channelMinMarginMap = useMemo<Partial<Record<AutoPriceChannel, number>>>(
    () => ({
      ml_classico: mlMinMargin,
      ml_premium: mlMinMargin,
      shopee: shopeeMinMargin,
      tiktok: tiktokMinMargin,
    }),
    [mlMinMargin, shopeeMinMargin, tiktokMinMargin]
  );

  // Audit every item using exact calculator.ts rules
  const auditedItems: AutoPriceAuditedItem[] = useMemo(() => {
    return rawItems.map((item) =>
      auditAutoPriceItem(item, settings, divergenceTolerance, channelMinMarginMap)
    );
  }, [rawItems, settings, divergenceTolerance, channelMinMarginMap]);

  // KPI Counters
  const kpiStats = useMemo(() => {
    const total = auditedItems.length;
    const prejuizo = auditedItems.filter((i) => i.status === 'prejuizo').length;
    const margemBaixa = auditedItems.filter((i) => i.status === 'margem_baixa').length;
    const divergencia = auditedItems.filter((i) => i.status === 'divergencia').length;
    const ok = auditedItems.filter((i) => i.status === 'ok').length;
    const attention = prejuizo + margemBaixa + divergencia;
    return { total, prejuizo, margemBaixa, divergencia, ok, attention };
  }, [auditedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return auditedItems.filter((item) => {
      if (statusFilter === 'attention' && !item.needsAttention) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'attention' &&
        item.status !== statusFilter
      ) {
        return false;
      }

      if (channelFilter === 'ml' && item.channel !== 'ml_classico' && item.channel !== 'ml_premium') {
        return false;
      }
      if (channelFilter === 'shopee' && item.channel !== 'shopee') return false;
      if (channelFilter === 'tiktok' && item.channel !== 'tiktok') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchMktId = item.marketplaceId.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        if (!matchSku && !matchMktId && !matchTitle) return false;
      }

      return true;
    });
  }, [auditedItems, statusFilter, channelFilter, searchTerm]);

  const showSuccess = (msg: string) => {
    setFeedbackError('');
    setFeedbackSuccess(msg);
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  const showError = (msg: string) => {
    setFeedbackSuccess('');
    setFeedbackError(msg);
  };

  // Spreadsheet upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const defaultWeight =
          settings.mercadoLivre.productWeight >= 0.001
            ? settings.mercadoLivre.productWeight
            : 1;
        const { rows, errors } = parseAutoPriceWorkbook(
          workbook,
          defaultImportChannel,
          defaultWeight
        );

        if (rows.length === 0) {
          showError(errors.join(' ') || 'Nenhum item válido encontrado na planilha.');
          return;
        }

        const merged = mergeAutoPriceRows(rawItems, rows, importMode, defaultWeight);
        setRawItems(merged.items);
        setEditBuffers({});
        showSuccess(
          importMode === 'replace'
            ? `${merged.addedCount} itens carregados da planilha "${file.name}".`
            : `Lote processado: ${merged.updatedCount} preços atualizados e ${merged.addedCount} novos itens adicionados.`
        );
      } catch (err) {
        console.error('Erro ao importar planilha:', err);
        showError('Falha ao ler o arquivo. Verifique se é um .xlsx, .xls ou .csv válido.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Paste CSV/TSV handler
  const handleProcessPastedData = () => {
    if (!pasteText.trim()) {
      showError('Cole os dados da planilha antes de processar.');
      return;
    }

    try {
      const workbook = XLSX.read(pasteText, { type: 'string' });
      const defaultWeight =
        settings.mercadoLivre.productWeight >= 0.001
          ? settings.mercadoLivre.productWeight
          : 1;
      const { rows, errors } = parseAutoPriceWorkbook(
        workbook,
        defaultImportChannel,
        defaultWeight
      );

      if (rows.length === 0) {
        showError(errors.join(' ') || 'Não foi possível identificar colunas válidas no texto colado.');
        return;
      }

      const merged = mergeAutoPriceRows(rawItems, rows, importMode, defaultWeight);
      setRawItems(merged.items);
      setEditBuffers({});
      setPasteText('');
      setShowPasteBox(false);
      showSuccess(
        `Dados processados: ${merged.updatedCount} atualizados e ${merged.addedCount} adicionados.`
      );
    } catch {
      showError('Erro ao interpretar os dados colados.');
    }
  };

  // Real API / Connector sync per channel
  const syncChannelFromApi = async (channelKey: 'ml' | 'shopee' | 'tiktok'): Promise<number> => {
    const config = syncConfigs[channelKey];
    if (!config.endpointUrl.trim()) {
      throw new Error(`Informe a URL do endpoint de API para ${channelKey.toUpperCase()}.`);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (config.authToken.trim()) {
      headers.Authorization = config.authToken.trim().startsWith('Bearer ')
        ? config.authToken.trim()
        : `Bearer ${config.authToken.trim()}`;
    }

    const response = await fetch(config.endpointUrl.trim(), { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao sincronizar ${channelKey.toUpperCase()}.`);
    }

    const payload = await response.json();
    const list: any[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    if (list.length === 0) {
      throw new Error(`O endpoint de ${channelKey.toUpperCase()} não retornou uma lista de itens.`);
    }

    const fallbackChannel: AutoPriceChannel =
      channelKey === 'ml' ? 'ml_classico' : channelKey;
    const defaultWeight =
      settings.mercadoLivre.productWeight >= 0.001 ? settings.mercadoLivre.productWeight : 1;

    const parsedRows = list.map((entry: any, idx: number) => {
      const rawCh = entry.channel || entry.marketplace || entry.listingType || '';
      const resolvedChannel = rawCh
        ? normalizeChannelString(String(rawCh), fallbackChannel)
        : fallbackChannel;

      const parsedPrice = parseNumber(
        entry.currentPrice ?? entry.price ?? entry.preco_praticado ?? entry.preco
      );
      const parsedCost = parseNumber(entry.cost ?? entry.custo);
      const parsedWeight = parseWeight(entry.weightKg ?? entry.peso);

      return {
        sku: String(entry.sku || entry.seller_sku || entry.marketplaceId || `API-${idx + 1}`).trim(),
        marketplaceId: String(
          entry.marketplaceId || entry.item_id || entry.mlb || entry.id_anuncio || entry.sku || ''
        ).trim(),
        title: String(entry.title || entry.titulo || entry.name || `Item ${entry.sku || idx + 1}`).trim(),
        channel: resolvedChannel,
        cost: parsedCost > 0 ? parsedCost : undefined,
        weightKg: parsedWeight >= 0.001 ? parsedWeight : defaultWeight,
        currentPrice: parsedPrice > 0 ? parsedPrice : undefined,
      };
    });

    const merged = mergeAutoPriceRows(rawItemsRef.current, parsedRows, 'merge', defaultWeight);
    const updatedAndAdded = merged.updatedCount + merged.addedCount;
    const nextItems = merged.items.map((it) =>
      parsedRows.some(
        (pr) =>
          pr.channel === it.channel &&
          ((pr.marketplaceId && pr.marketplaceId.toUpperCase() === it.marketplaceId.toUpperCase()) ||
            pr.sku.toUpperCase() === it.sku.toUpperCase())
      )
        ? { ...it, syncSource: 'api' as const }
        : it
    );
    rawItemsRef.current = nextItems;
    setRawItems(nextItems);
    setEditBuffers({});

    setSyncConfigs((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        lastSyncAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    }));

    return updatedAndAdded;
  };

  const handleSyncChannel = async (channelKey: 'ml' | 'shopee' | 'tiktok') => {
    setSyncingChannel(channelKey);
    setFeedbackError('');
    try {
      const count = await syncChannelFromApi(channelKey);
      showSuccess(`Sincronização concluída: ${count} itens processados.`);
    } catch (err: any) {
      showError(err?.message || 'Erro ao sincronizar canal via API.');
    } finally {
      setSyncingChannel(null);
    }
  };

  const handleSyncAllConfigured = async () => {
    const activeChannels = (['ml', 'shopee', 'tiktok'] as const).filter(
      (ch) => syncConfigs[ch].endpointUrl.trim() !== ''
    );
    if (activeChannels.length === 0) {
      setShowApiPanel(true);
      showError('Configure pelo menos uma URL de endpoint antes de sincronizar via API.');
      return;
    }

    setSyncingChannel('all');
    setFeedbackError('');
    let totalCount = 0;
    const errors: string[] = [];

    for (const ch of activeChannels) {
      try {
        totalCount += await syncChannelFromApi(ch);
      } catch (err: any) {
        errors.push(err?.message || `Falha em ${ch}`);
      }
    }

    setSyncingChannel(null);
    if (errors.length > 0) {
      showError(errors.join(' | '));
    } else {
      showSuccess(`Sincronização global concluída (${totalCount} registros processados).`);
    }
  };

  // Manual single item creation
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseNumber(newItemForm.cost);
    const currentPrice = parseNumber(newItemForm.currentPrice);
    const weightKg = parseWeight(newItemForm.weight);

    if (!newItemForm.sku.trim() && !newItemForm.marketplaceId.trim()) {
      showError('Informe pelo menos o SKU ou o ID do produto no marketplace.');
      return;
    }
    if (cost <= 0 || currentPrice <= 0) {
      showError('Informe valores válidos maiores que zero para Custo e Preço Praticado.');
      return;
    }

    const newItem: AutoPriceRawItem = {
      id: `manual-${Date.now()}`,
      sku: newItemForm.sku.trim() || newItemForm.marketplaceId.trim(),
      marketplaceId: newItemForm.marketplaceId.trim(),
      title: newItemForm.title.trim() || `Produto ${newItemForm.sku.trim()}`,
      channel: newItemForm.channel,
      cost,
      weightKg: weightKg >= 0.001 ? weightKg : 1,
      currentPrice,
      lastUpdatedAt: new Date().toISOString(),
      syncSource: 'manual',
    };

    setRawItems((prev) => [newItem, ...prev]);
    setNewItemForm({
      sku: '',
      marketplaceId: '',
      channel: newItemForm.channel,
      title: '',
      cost: '',
      weight: '0,500',
      currentPrice: '',
    });
    setShowAddForm(false);
    showSuccess('Item adicionado para conferência automática.');
  };

  // Inline editing helpers using string buffers
  const getBufferValue = (itemId: string, field: string, fallbackNumber: number): string => {
    const key = `${itemId}:${field}`;
    if (editBuffers[key] !== undefined) return editBuffers[key];
    return fallbackNumber > 0 ? String(fallbackNumber).replace('.', ',') : '';
  };

  const handleBufferChange = (
    itemId: string,
    field: 'cost' | 'currentPrice' | 'weightKg',
    rawVal: string
  ) => {
    const key = `${itemId}:${field}`;
    setEditBuffers((prev) => ({ ...prev, [key]: rawVal }));

    const parsed = field === 'weightKg' ? parseWeight(rawVal) : parseNumber(rawVal);
    if (field === 'weightKg') {
      if (parsed >= 0.001) {
        setRawItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, weightKg: parsed } : it))
        );
      }
    } else {
      setRawItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, [field]: Math.max(0, parsed) } : it))
      );
    }
  };

  const handleMarketplaceIdChange = (itemId: string, value: string) => {
    setRawItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, marketplaceId: value } : it))
    );
  };

  const handleApplyIdealPrice = (item: AutoPriceAuditedItem) => {
    if (item.idealPrice <= 0) return;
    const key = `${item.id}:currentPrice`;
    setEditBuffers((prev) => ({
      ...prev,
      [key]: item.idealPrice.toFixed(2).replace('.', ','),
    }));
    setRawItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? {
              ...it,
              currentPrice: item.idealPrice,
              lastUpdatedAt: new Date().toISOString(),
              syncSource: 'manual',
            }
          : it
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setRawItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleLoadSampleData = () => {
    const wb = generateSampleAutoPriceWorkbook();
    const defaultWeight =
      settings.mercadoLivre.productWeight >= 0.001 ? settings.mercadoLivre.productWeight : 1;
    const { rows } = parseAutoPriceWorkbook(wb, 'ml_classico', defaultWeight);
    const merged = mergeAutoPriceRows(rawItems, rows, 'replace', defaultWeight);
    setRawItems(merged.items);
    setEditBuffers({});
    showSuccess('Dados de exemplo carregados para demonstração nos 3 marketplaces.');
  };

  const handleDownloadTemplate = () => {
    const wb = generateSampleAutoPriceWorkbook();
    XLSX.writeFile(wb, 'Modelo_Conferencia_Automatica_Precifica_Facil.xlsx');
  };

  const handleExportExcel = () => {
    if (filteredItems.length === 0) return;
    const rows = filteredItems.map((it) => ({
      SKU: it.sku,
      'ID Marketplace': it.marketplaceId,
      Canal: getChannelDisplayName(it.channel),
      Título: it.title,
      'Custo (R$)': it.cost,
      'Peso (kg)': it.weightKg,
      'Preço Praticado (R$)': it.currentPrice,
      'Preço Piso 0% (R$)': it.floorPrice,
      'Preço Ideal Meta (R$)': it.idealPrice,
      'Margem Atual (%)': it.currentMarginPercent,
      'Margem Alvo (%)': it.targetMarginPercent,
      'Lucro Atual (R$)': it.currentGrossProfit,
      'Ajuste Necessário (R$)': it.adjustmentReais,
      'Ajuste Necessário (%)': it.adjustmentPercent,
      Classificação: getStatusMeta(it.status).label,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conferencia Automatica');
    XLSX.writeFile(
      wb,
      `Conferencia_Automatica_Precos_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const rows = filteredItems.map((it) => ({
      SKU: it.sku,
      'ID Marketplace': it.marketplaceId,
      Canal: getChannelDisplayName(it.channel),
      Título: it.title,
      'Custo (R$)': it.cost,
      'Preço Praticado (R$)': it.currentPrice,
      'Preço Ideal Meta (R$)': it.idealPrice,
      'Margem Atual (%)': it.currentMarginPercent,
      'Margem Alvo (%)': it.targetMarginPercent,
      'Ajuste (R$)': it.adjustmentReais,
      'Ajuste (%)': it.adjustmentPercent,
      Classificação: getStatusMeta(it.status).label,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Conferencia_Automatica_Precos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Tela / Módulo */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Conferência Automática de Preços
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Auditoria multicanal comparando os preços praticados no Mercado Livre, Shopee e
              TikTok Shop com o preço ideal e piso calculados pela ferramenta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Modelo Planilha (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => setShowApiPanel((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                showApiPanel
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Sincronização / API
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Item
            </button>
          </div>
        </div>

        {/* Barra de Importação em Lote + Parâmetros de Margem/Divergência */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pt-5">
          {/* Upload / Atualização em Lote */}
          <div className="xl:col-span-6 bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Importar / Atualizar Preços em Lote
                </span>
              </div>

              {/* Modo: Atualizar/Mesclar vs Substituir */}
              <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    importMode === 'merge'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Atualizar / Mesclar
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    importMode === 'replace'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Substituir Lista
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={defaultImportChannel}
                onChange={(e) => setDefaultImportChannel(e.target.value as AutoPriceChannel)}
                aria-label="Canal padrão caso a planilha não informe"
                className="h-9 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ml_classico">Canal padrão: ML Clássico</option>
                <option value="ml_premium">Canal padrão: ML Premium</option>
                <option value="shopee">Canal padrão: Shopee</option>
                <option value="tiktok">Canal padrão: TikTok Shop</option>
              </select>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <FileUp className="w-3.5 h-3.5" />
                Enviar CSV / XLSX
              </button>

              <button
                type="button"
                onClick={() => setShowPasteBox((v) => !v)}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                Colar Dados
              </button>

              <button
                type="button"
                onClick={handleSyncAllConfigured}
                disabled={syncingChannel !== null}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncingChannel ? 'animate-spin' : ''}`}
                />
                Sincronizar API
              </button>
            </div>

            {showPasteBox && (
              <div className="pt-2 space-y-2">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Cole do Excel com cabeçalho:\nSKU\tID Marketplace\tCanal\tTítulo\tCusto\tPeso\tPreço Praticado`}
                  className="w-full h-24 p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessPastedData}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Processar Texto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Parâmetros de Margem Mínima e Tolerância */}
          <div className="xl:col-span-6 bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Margem Mínima Alvo &amp; Tolerância
                </span>
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Simples Nacional ativo: <strong>{settings.simplesNacional}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Meta ML (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="80"
                  value={mlMinMargin}
                  onChange={(e) => setMlMinMargin(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Meta Shopee (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="80"
                  value={shopeeMinMargin}
                  onChange={(e) => setShopeeMinMargin(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Meta TikTok (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="80"
                  value={tiktokMinMargin}
                  onChange={(e) => setTiktokMinMargin(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Divergência (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="50"
                  value={divergenceTolerance}
                  onChange={(e) => setDivergenceTolerance(parseFloat(e.target.value) || 5)}
                  title="Diferença percentual em relação ao preço ideal para sinalizar Divergência de Preço"
                  className="w-full h-9 px-2.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Configuração de Sincronização / API por Canal */}
        {showApiPanel && (
          <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sincronização de Preços via API / Integrador por Canal
                </h3>
                <p className="text-xs text-slate-500">
                  Informe o endpoint JSON do seu integrador/ERP para cada marketplace. O sistema
                  faz a correspondência automática pelo <strong>ID Marketplace</strong> ou{' '}
                  <strong>SKU</strong>.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                JSON esperado: [{'{'} sku, marketplaceId, currentPrice, cost?, weightKg? {'}'}]
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {(
                [
                  { key: 'ml', title: 'Mercado Livre (Clássico / Premium)', dot: 'bg-yellow-400' },
                  { key: 'shopee', title: 'Shopee', dot: 'bg-[#EE4D2D]' },
                  { key: 'tiktok', title: 'TikTok Shop', dot: 'bg-neutral-900' },
                ] as const
              ).map((ch) => (
                <div
                  key={ch.key}
                  className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${ch.dot}`} />
                      <span className="text-xs font-bold text-slate-900">{ch.title}</span>
                    </div>
                    {syncConfigs[ch.key].lastSyncAt && (
                      <span className="text-[10px] text-slate-500 tabular-nums">
                        Último sync: {syncConfigs[ch.key].lastSyncAt}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Endpoint URL (GET JSON)
                    </label>
                    <input
                      type="url"
                      value={syncConfigs[ch.key].endpointUrl}
                      onChange={(e) =>
                        setSyncConfigs((prev) => ({
                          ...prev,
                          [ch.key]: { ...prev[ch.key], endpointUrl: e.target.value },
                        }))
                      }
                      placeholder="https://api.seuerp.com/precos"
                      className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Bearer Token (opcional, apenas nesta sessão)
                    </label>
                    <input
                      type="password"
                      value={syncConfigs[ch.key].authToken}
                      onChange={(e) =>
                        setSyncConfigs((prev) => ({
                          ...prev,
                          [ch.key]: { ...prev[ch.key], authToken: e.target.value },
                        }))
                      }
                      placeholder="Token de autorização"
                      className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSyncChannel(ch.key)}
                    disabled={syncingChannel !== null || !syncConfigs[ch.key].endpointUrl.trim()}
                    className="w-full h-8 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-40"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncingChannel === ch.key ? 'animate-spin' : ''}`}
                    />
                    Sincronizar {ch.key.toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulário de Adição Manual */}
        {showAddForm && (
          <form
            onSubmit={handleAddManualItem}
            className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Novo Item para Conferência
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Fechar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              <input
                type="text"
                placeholder="SKU (ex: FONE-01)"
                value={newItemForm.sku}
                onChange={(e) => setNewItemForm((f) => ({ ...f, sku: e.target.value }))}
                className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="ID Marketplace (MLB/ID)"
                value={newItemForm.marketplaceId}
                onChange={(e) => setNewItemForm((f) => ({ ...f, marketplaceId: e.target.value }))}
                className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <select
                value={newItemForm.channel}
                onChange={(e) =>
                  setNewItemForm((f) => ({ ...f, channel: e.target.value as AutoPriceChannel }))
                }
                className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="ml_classico">Mercado Livre Clássico</option>
                <option value="ml_premium">Mercado Livre Premium</option>
                <option value="shopee">Shopee</option>
                <option value="tiktok">TikTok Shop</option>
              </select>
              <input
                type="text"
                placeholder="Título do produto"
                value={newItemForm.title}
                onChange={(e) => setNewItemForm((f) => ({ ...f, title: e.target.value }))}
                className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custo R$ (ex: 35,00)"
                value={newItemForm.cost}
                onChange={(e) => setNewItemForm((f) => ({ ...f, cost: e.target.value }))}
                className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Peso kg (ex: 0,500)"
                value={newItemForm.weight}
                onChange={(e) => setNewItemForm((f) => ({ ...f, weight: e.target.value }))}
                className="h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Preço Atual R$"
                  value={newItemForm.currentPrice}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, currentPrice: e.target.value }))}
                  className="w-full h-9 px-2.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-3 h-9 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0"
                >
                  Salvar
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Feedback */}
      {feedbackError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{feedbackError}</span>
        </div>
      )}
      {feedbackSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* KPIs de Auditoria */}
      {auditedItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Analisados
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{kpiStats.total}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'attention' ? 'all' : 'attention'))
            }
            className={`text-left p-4 rounded-xl border transition-colors ${
              statusFilter === 'attention'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Precisam Atenção
            </span>
            <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
              {kpiStats.attention}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'prejuizo' ? 'all' : 'prejuizo'))
            }
            className={`text-left p-4 rounded-xl border transition-colors ${
              statusFilter === 'prejuizo'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">
              Prejuízo / Piso
            </span>
            <p className="text-2xl font-bold text-red-600 mt-1 tabular-nums">
              {kpiStats.prejuizo}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'margem_baixa' ? 'all' : 'margem_baixa'))
            }
            className={`text-left p-4 rounded-xl border transition-colors ${
              statusFilter === 'margem_baixa'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Margem Baixa
            </span>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
              {kpiStats.margemBaixa}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === 'divergencia' ? 'all' : 'divergencia'))
            }
            className={`text-left p-4 rounded-xl border transition-colors ${
              statusFilter === 'divergencia'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
              Divergência
            </span>
            <p className="text-2xl font-bold text-blue-600 mt-1 tabular-nums">
              {kpiStats.divergencia}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === 'ok' ? 'all' : 'ok'))}
            className={`text-left p-4 rounded-xl border transition-colors ${
              statusFilter === 'ok'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Preços OK
            </span>
            <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
              {kpiStats.ok}
            </p>
          </button>
        </div>
      )}

      {/* Barra de Filtros, Busca e Exportação */}
      {auditedItems.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Busca */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por SKU, ID Marketplace (MLB/ID) ou título..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro rápido de atenção & status */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({kpiStats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('attention')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1 ${
                    statusFilter === 'attention'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-amber-800 hover:bg-amber-100/70'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  Precisam de Atenção ({kpiStats.attention})
                </button>
              </div>

              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                aria-label="Filtrar por canal"
                className="h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Canais</option>
                <option value="ml">Mercado Livre</option>
                <option value="shopee">Shopee</option>
                <option value="tiktok">TikTok Shop</option>
              </select>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                XLSX
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setRawItems([]);
                  setEditBuffers({});
                }}
                className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-semibold text-red-600 bg-white border border-slate-200 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                title="Limpar todos os itens"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
          </div>

          {/* Tabela Comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 pl-4 pr-3">Canal / SKU / ID Marketplace</th>
                  <th className="py-3 px-3 text-right">Custo / Peso</th>
                  <th className="py-3 px-3 text-right">Preço Praticado</th>
                  <th className="py-3 px-3 text-right">Preço Ideal / Piso</th>
                  <th className="py-3 px-3 text-right">Margem Atual vs Alvo</th>
                  <th className="py-3 px-3 text-right">Ajuste p/ Margem Alvo</th>
                  <th className="py-3 px-3 text-center">Classificação</th>
                  <th className="py-3 pl-2 pr-4 w-24 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredItems.map((item) => {
                  const statusMeta = getStatusMeta(item.status);
                  const StatusIcon = statusMeta.Icon;
                  const isExpanded = !!expandedRows[item.id];
                  const isML = item.channel === 'ml_classico' || item.channel === 'ml_premium';

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        {/* Canal + SKU + ID Marketplace + Título */}
                        <td className="py-3 pl-4 pr-3 align-middle max-w-[290px]">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${getChannelDotClass(
                                item.channel
                              )}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">
                                  {getChannelDisplayName(item.channel)}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  · {item.sku}
                                </span>
                              </div>
                              <p
                                className="text-xs text-slate-700 truncate mt-0.5"
                                title={item.title}
                              >
                                {item.title}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase text-slate-400">
                                  ID Canal:
                                </span>
                                <input
                                  type="text"
                                  value={item.marketplaceId}
                                  onChange={(e) =>
                                    handleMarketplaceIdChange(item.id, e.target.value)
                                  }
                                  placeholder="Ex: MLB12345"
                                  className="h-5 px-1.5 text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Custo / Peso editáveis */}
                        <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-[10px] text-slate-400">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getBufferValue(item.id, 'cost', item.cost)}
                              onChange={(e) =>
                                handleBufferChange(item.id, 'cost', e.target.value)
                              }
                              aria-label={`Custo do SKU ${item.sku}`}
                              className="w-20 h-7 px-2 text-right text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          {isML && (
                            <div className="mt-1 inline-flex items-center justify-end gap-1 ml-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={getBufferValue(item.id, 'weightKg', item.weightKg)}
                                onChange={(e) =>
                                  handleBufferChange(item.id, 'weightKg', e.target.value)
                                }
                                aria-label={`Peso em kg do SKU ${item.sku}`}
                                className="w-14 h-6 px-1.5 text-right text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-[10px] text-slate-400">kg</span>
                            </div>
                          )}
                        </td>

                        {/* Preço Praticado editável */}
                        <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-[11px] font-semibold text-slate-400">R$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={getBufferValue(item.id, 'currentPrice', item.currentPrice)}
                              onChange={(e) =>
                                handleBufferChange(item.id, 'currentPrice', e.target.value)
                              }
                              aria-label={`Preço praticado do SKU ${item.sku}`}
                              className="w-24 h-8 px-2 text-right text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          {item.syncSource && (
                            <div className="text-[10px] text-slate-400 mt-0.5 uppercase">
                              Origem: {item.syncSource}
                            </div>
                          )}
                        </td>

                        {/* Preço Ideal & Piso */}
                        <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                          <div className="text-sm font-bold text-blue-600">
                            {item.idealPrice > 0 ? formatCurrency(item.idealPrice) : '---'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Piso 0%: {item.floorPrice > 0 ? formatCurrency(item.floorPrice) : '---'}
                          </div>
                        </td>

                        {/* Margem Atual vs Alvo */}
                        <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                          <div
                            className={`text-sm font-bold ${
                              item.currentMarginPercent <= 0
                                ? 'text-red-600'
                                : item.currentMarginPercent < item.targetMarginPercent - 0.05
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {formatPercentage(item.currentMarginPercent)}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Meta: {formatPercentage(item.targetMarginPercent)} ·{' '}
                            {formatCurrency(item.currentGrossProfit)}
                          </div>
                        </td>

                        {/* Ajuste R$ e % */}
                        <td className="py-3 px-3 text-right align-middle whitespace-nowrap tabular-nums">
                          {item.idealPrice > 0 ? (
                            <div>
                              <div
                                className={`inline-flex items-center justify-end gap-0.5 text-sm font-bold ${
                                  item.adjustmentReais > 0.01
                                    ? 'text-red-600'
                                    : item.adjustmentReais < -0.01
                                    ? 'text-blue-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {item.adjustmentReais > 0.01 && (
                                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                                )}
                                {item.adjustmentReais < -0.01 && (
                                  <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>
                                  {item.adjustmentReais > 0 ? '+' : ''}
                                  {formatCurrency(item.adjustmentReais)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                ({item.adjustmentPercent > 0 ? '+' : ''}
                                {item.adjustmentPercent.toFixed(1)}%)
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">---</span>
                          )}
                        </td>

                        {/* Classificação */}
                        <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{statusMeta.shortLabel}</span>
                          </span>
                        </td>

                        {/* Ações & Expandir */}
                        <td className="py-3 pl-2 pr-4 text-right align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {item.needsAttention && item.idealPrice > 0 && (
                              <button
                                type="button"
                                onClick={() => handleApplyIdealPrice(item)}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                                title="Aplicar preço ideal neste item"
                              >
                                Aplicar Ideal
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRows((prev) => ({
                                  ...prev,
                                  [item.id]: !prev[item.id],
                                }))
                              }
                              aria-expanded={isExpanded}
                              aria-label="Ver detalhamento de taxas"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-blue-600' : ''
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label="Remover item"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={8} className="px-4 py-3.5 border-t border-slate-100">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                              <div>
                                <span className="block text-[11px] text-slate-500">
                                  Comissão Praticada ({formatPercentage(item.currentCommissionPercent)})
                                </span>
                                <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                                  {formatCurrency(item.currentCommissionValue)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-slate-500">
                                  Taxa Fixa / Frete Atual
                                </span>
                                <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                                  {formatCurrency(item.currentFixedFee)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-slate-500">
                                  Simples Nacional ({formatPercentage(item.currentTaxPercent)})
                                </span>
                                <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                                  {formatCurrency(item.currentTaxValue)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-slate-500">
                                  Lucro Bruto Praticado
                                </span>
                                <span
                                  className={`font-semibold tabular-nums mt-0.5 block ${
                                    item.currentGrossProfit <= 0
                                      ? 'text-red-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {formatCurrency(item.currentGrossProfit)}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-slate-500">
                                  Divergência vs Ideal
                                </span>
                                <span className="font-semibold text-slate-900 tabular-nums mt-0.5 block">
                                  {item.priceDeviationPercent.toFixed(2)}% (tolerância{' '}
                                  {divergenceTolerance}%)
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-slate-500">
                                  Classificação Completa
                                </span>
                                <span className="font-semibold text-slate-900 mt-0.5 block">
                                  {statusMeta.label}
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

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum item encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GitCompare className="w-6 h-6" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Nenhum anúncio carregado para conferência automática
            </h3>
            <p className="text-xs text-slate-500">
              Envie uma planilha CSV/XLSX com os preços praticados no Mercado Livre, Shopee e
              TikTok Shop, conecte um endpoint de sincronização via API ou carregue os dados de
              exemplo abaixo para testar imediatamente.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Carregar Planilha de Exemplo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <FileUp className="w-4 h-4" />
              Importar CSV / XLSX
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import * as XLSX from 'xlsx';
import { AppSettings, Platform } from '../types';
import {
  calculateMercadoLivrePrice,
  calculateShopeePrice,
  calculateTikTokShopPrice,
  parseNumber,
  parseWeight,
  simulateMargin,
} from './calculator';

export type AutoPriceChannel = 'ml_classico' | 'ml_premium' | 'shopee' | 'tiktok';

export type AutoPriceStatus = 'ok' | 'margem_baixa' | 'prejuizo' | 'divergencia';

export interface ChannelEndpointConfig {
  endpointUrl: string;
  authToken: string;
  lastSyncAt?: string;
}

export interface ChannelSyncConfigs {
  ml: ChannelEndpointConfig;
  shopee: ChannelEndpointConfig;
  tiktok: ChannelEndpointConfig;
}

export interface AutoPriceRawItem {
  id: string;
  sku: string;
  marketplaceId: string;
  title: string;
  channel: AutoPriceChannel;
  cost: number;
  weightKg: number;
  currentPrice: number;
  minMarginOverride?: number;
  commissionOverride?: number;
  lastUpdatedAt?: string;
  syncSource?: 'manual' | 'planilha' | 'api';
}

export interface AutoPriceAuditedItem extends AutoPriceRawItem {
  targetMarginPercent: number;
  idealPrice: number;
  floorPrice: number;
  currentCommissionValue: number;
  currentCommissionPercent: number;
  currentFixedFee: number;
  currentTaxValue: number;
  currentTaxPercent: number;
  currentGrossProfit: number;
  currentMarginPercent: number;
  adjustmentReais: number;
  adjustmentPercent: number;
  priceDeviationPercent: number;
  status: AutoPriceStatus;
  needsAttention: boolean;
}

export function channelToPlatform(channel: AutoPriceChannel): Platform {
  switch (channel) {
    case 'ml_classico':
      return Platform.ML_CLASSICO;
    case 'ml_premium':
      return Platform.ML_PREMIUM;
    case 'shopee':
      return Platform.SHOPEE;
    case 'tiktok':
      return Platform.TIKTOK_SHOP;
  }
}

export function getChannelDisplayName(channel: AutoPriceChannel): string {
  switch (channel) {
    case 'ml_classico':
      return 'Mercado Livre Clássico';
    case 'ml_premium':
      return 'Mercado Livre Premium';
    case 'shopee':
      return 'Shopee';
    case 'tiktok':
      return 'TikTok Shop';
  }
}

export function getChannelShortLabel(channel: AutoPriceChannel): 'ml' | 'shopee' | 'tiktok' {
  if (channel === 'ml_classico' || channel === 'ml_premium') return 'ml';
  return channel;
}

export function normalizeChannelString(
  rawChannel: string,
  fallback: AutoPriceChannel = 'ml_classico'
): AutoPriceChannel {
  const norm = (rawChannel || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (!norm) return fallback;
  if (norm.includes('shopee')) return 'shopee';
  if (norm.includes('tiktok') || norm.includes('tik tok')) return 'tiktok';
  if (norm.includes('premium')) return 'ml_premium';
  if (norm.includes('mercado') || norm === 'ml' || norm.includes('classico')) {
    return 'ml_classico';
  }
  return fallback;
}

function getDefaultChannelMargin(channel: AutoPriceChannel, settings: AppSettings): number {
  switch (channel) {
    case 'ml_classico':
    case 'ml_premium':
      return settings.mercadoLivre.contributionMargin;
    case 'shopee':
      return settings.shopee.contributionMargin;
    case 'tiktok':
      return settings.tiktok.contributionMargin;
  }
}

function round2(val: number): number {
  if (!isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
}

/**
 * Audita um item comparando o preço praticado no marketplace com a lógica nativa
 * do Precifica Fácil (custos, Simples Nacional, taxas fixas/frete e comissões).
 */
export function auditAutoPriceItem(
  item: AutoPriceRawItem,
  settings: AppSettings,
  divergenceTolerancePercent: number = 5,
  channelMinMarginOverrides?: Partial<Record<AutoPriceChannel, number>>
): AutoPriceAuditedItem {
  const cost = Math.max(0, item.cost);
  const currentPrice = Math.max(0, item.currentPrice);
  const weightKg =
    item.weightKg && item.weightKg >= 0.001
      ? item.weightKg
      : settings.mercadoLivre.productWeight >= 0.001
      ? settings.mercadoLivre.productWeight
      : 1;

  const targetMargin =
    item.minMarginOverride !== undefined && isFinite(item.minMarginOverride)
      ? Math.max(0, item.minMarginOverride)
      : channelMinMarginOverrides?.[item.channel] !== undefined
      ? Math.max(0, channelMinMarginOverrides[item.channel]!)
      : getDefaultChannelMargin(item.channel, settings);

  const effectiveSettings: AppSettings = {
    ...settings,
    mercadoLivre: {
      ...settings.mercadoLivre,
      contributionMargin:
        item.channel === 'ml_classico' || item.channel === 'ml_premium'
          ? targetMargin
          : settings.mercadoLivre.contributionMargin,
      classicCommission:
        item.channel === 'ml_classico' && item.commissionOverride && item.commissionOverride > 0
          ? item.commissionOverride
          : settings.mercadoLivre.classicCommission,
      premiumCommission:
        item.channel === 'ml_premium' && item.commissionOverride && item.commissionOverride > 0
          ? item.commissionOverride
          : settings.mercadoLivre.premiumCommission,
    },
    shopee: {
      ...settings.shopee,
      contributionMargin:
        item.channel === 'shopee' ? targetMargin : settings.shopee.contributionMargin,
    },
    tiktok: {
      ...settings.tiktok,
      contributionMargin:
        item.channel === 'tiktok' ? targetMargin : settings.tiktok.contributionMargin,
    },
  };

  const zeroMarginSettings: AppSettings = {
    ...effectiveSettings,
    mercadoLivre: { ...effectiveSettings.mercadoLivre, contributionMargin: 0 },
    shopee: { ...effectiveSettings.shopee, contributionMargin: 0 },
    tiktok: { ...effectiveSettings.tiktok, contributionMargin: 0 },
  };

  let idealPrice = 0;
  let floorPrice = 0;

  if (cost > 0) {
    switch (item.channel) {
      case 'ml_classico': {
        const commRate = effectiveSettings.mercadoLivre.classicCommission / 100;
        idealPrice = calculateMercadoLivrePrice(cost, commRate, weightKg, effectiveSettings).finalPrice;
        floorPrice = calculateMercadoLivrePrice(cost, commRate, weightKg, zeroMarginSettings).finalPrice;
        break;
      }
      case 'ml_premium': {
        const commRate = effectiveSettings.mercadoLivre.premiumCommission / 100;
        idealPrice = calculateMercadoLivrePrice(cost, commRate, weightKg, effectiveSettings).finalPrice;
        floorPrice = calculateMercadoLivrePrice(cost, commRate, weightKg, zeroMarginSettings).finalPrice;
        break;
      }
      case 'shopee': {
        idealPrice = calculateShopeePrice(cost, effectiveSettings).finalPrice;
        floorPrice = calculateShopeePrice(cost, zeroMarginSettings).finalPrice;
        break;
      }
      case 'tiktok': {
        idealPrice = calculateTikTokShopPrice(cost, effectiveSettings).finalPrice;
        floorPrice = calculateTikTokShopPrice(cost, zeroMarginSettings).finalPrice;
        break;
      }
    }
  }

  // Simula o preço praticado usando exatamente simulateMargin do calculator.ts
  const targetPlatform = channelToPlatform(item.channel);
  const simResults = simulateMargin(cost, currentPrice, weightKg, effectiveSettings);
  const matchedSim = simResults.find((r) => r.platform === targetPlatform);

  const currentCommissionValue = matchedSim ? matchedSim.commission : 0;
  const currentCommissionPercent = matchedSim?.commissionPercent ?? 0;
  const currentFixedFee = matchedSim ? matchedSim.fixedFee : 0;
  const currentTaxValue = matchedSim ? matchedSim.tax : 0;
  const currentTaxPercent = matchedSim?.taxPercent ?? settings.simplesNacional;
  const currentGrossProfit = matchedSim ? matchedSim.grossProfit : 0;
  const currentMarginPercent = matchedSim ? matchedSim.calculatedMargin : 0;

  const validIdealPrice = isFinite(idealPrice) ? round2(idealPrice) : 0;
  const validFloorPrice = isFinite(floorPrice) ? round2(floorPrice) : 0;

  const isBelowFloor =
    currentPrice <= 0 ||
    cost <= 0 ||
    currentGrossProfit <= 0 ||
    (validFloorPrice > 0 && currentPrice < validFloorPrice - 0.01);

  const isLowMargin = !isBelowFloor && currentMarginPercent < targetMargin - 0.05;

  const priceDeviationPercent =
    validIdealPrice > 0
      ? Math.abs((currentPrice - validIdealPrice) / validIdealPrice) * 100
      : 0;

  const isPriceDivergent =
    !isBelowFloor &&
    !isLowMargin &&
    validIdealPrice > 0 &&
    priceDeviationPercent >= Math.max(0.1, divergenceTolerancePercent);

  let status: AutoPriceStatus = 'ok';
  if (isBelowFloor) {
    status = 'prejuizo';
  } else if (isLowMargin) {
    status = 'margem_baixa';
  } else if (isPriceDivergent) {
    status = 'divergencia';
  }

  const adjustmentReais =
    validIdealPrice > 0 ? round2(validIdealPrice - currentPrice) : 0;
  const adjustmentPercent =
    currentPrice > 0 && validIdealPrice > 0
      ? round2(((validIdealPrice - currentPrice) / currentPrice) * 100)
      : 0;

  return {
    ...item,
    cost: round2(cost),
    weightKg,
    currentPrice: round2(currentPrice),
    targetMarginPercent: round2(targetMargin),
    idealPrice: validIdealPrice,
    floorPrice: validFloorPrice,
    currentCommissionValue: round2(currentCommissionValue),
    currentCommissionPercent: round2(currentCommissionPercent),
    currentFixedFee: round2(currentFixedFee),
    currentTaxValue: round2(currentTaxValue),
    currentTaxPercent: round2(currentTaxPercent),
    currentGrossProfit: round2(currentGrossProfit),
    currentMarginPercent: round2(currentMarginPercent),
    adjustmentReais,
    adjustmentPercent,
    priceDeviationPercent: round2(priceDeviationPercent),
    status,
    needsAttention: status !== 'ok',
  };
}

function normalizeHeader(str: string): string {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parsePercentCell(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    if (val > 0 && val <= 1) return Math.round(val * 10000) / 100;
    return val;
  }
  const clean = val.toString().trim().replace('%', '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return undefined;
  if (num > 0 && num <= 1 && !val.toString().includes('%')) {
    return Math.round(num * 10000) / 100;
  }
  return num;
}

export interface ParsedAutoPriceRow {
  sku: string;
  marketplaceId: string;
  title: string;
  channel: AutoPriceChannel;
  cost?: number;
  weightKg?: number;
  currentPrice?: number;
  minMarginOverride?: number;
  commissionOverride?: number;
}

/**
 * Lê planilhas XLSX/XLS/CSV com produtos e preços praticados nos canais
 * (Mercado Livre, Shopee, TikTok Shop).
 */
export function parseAutoPriceWorkbook(
  workbook: XLSX.WorkBook,
  defaultChannel: AutoPriceChannel = 'ml_classico',
  defaultWeightKg: number = 1
): { rows: ParsedAutoPriceRow[]; errors: string[] } {
  const errors: string[] = [];
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return { rows: [], errors: ['A planilha não possui dados válidos.'] };
  }

  const ws = workbook.Sheets[firstSheet];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    return { rows: [], errors: ['A planilha está vazia.'] };
  }

  let headerRowIndex = -1;
  let bestScore = 0;
  let cols = {
    sku: -1,
    marketplaceId: -1,
    channel: -1,
    title: -1,
    cost: -1,
    price: -1,
    weight: -1,
    minMargin: -1,
    commission: -1,
  };

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    let skuIdx = -1;
    let mktIdIdx = -1;
    let channelIdx = -1;
    let titleIdx = -1;
    let costIdx = -1;
    let priceIdx = -1;
    let weightIdx = -1;
    let marginIdx = -1;
    let commIdx = -1;
    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeader(String(row[c] || ''));
      if (!cell) continue;

      if (
        mktIdIdx === -1 &&
        (cell.includes('id marketplace') ||
          cell.includes('id do anuncio') ||
          cell.includes('id anuncio') ||
          cell.includes('item id') ||
          cell.includes('product id') ||
          cell === 'mlb' ||
          cell === 'id canal' ||
          cell === 'codigo anuncio' ||
          cell === 'codigo do anuncio')
      ) {
        mktIdIdx = c;
        score += 3;
      } else if (
        skuIdx === -1 &&
        (cell === 'sku' ||
          cell.includes('sku') ||
          cell === 'codigo' ||
          cell === 'referencia' ||
          cell === 'identificador')
      ) {
        skuIdx = c;
        score += 3;
      } else if (
        channelIdx === -1 &&
        (cell === 'canal' ||
          cell.includes('marketplace') ||
          cell.includes('plataforma') ||
          cell === 'canal de venda')
      ) {
        channelIdx = c;
        score += 2;
      } else if (
        titleIdx === -1 &&
        (cell.includes('titulo') ||
          cell.includes('nome') ||
          cell.includes('descricao') ||
          cell === 'produto' ||
          cell === 'anuncio')
      ) {
        titleIdx = c;
        score += 2;
      } else if (
        costIdx === -1 &&
        (cell.includes('custo') || cell === 'cmc' || cell === 'valor compra')
      ) {
        costIdx = c;
        score += 2;
      } else if (
        priceIdx === -1 &&
        (cell.includes('preco praticado') ||
          cell.includes('preco atual') ||
          cell.includes('preco de venda') ||
          cell === 'preco' ||
          cell === 'valor venda' ||
          cell === 'valor')
      ) {
        priceIdx = c;
        score += 3;
      } else if (
        weightIdx === -1 &&
        (cell.includes('peso') || cell.includes('kg'))
      ) {
        weightIdx = c;
        score += 1;
      } else if (
        marginIdx === -1 &&
        (cell.includes('margem minima') ||
          cell.includes('margem alvo') ||
          cell.includes('margem meta') ||
          cell === 'margem')
      ) {
        marginIdx = c;
        score += 1;
      } else if (
        commIdx === -1 &&
        (cell.includes('comissao') || cell.includes('tarifa'))
      ) {
        commIdx = c;
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = r;
      cols = {
        sku: skuIdx,
        marketplaceId: mktIdIdx,
        channel: channelIdx,
        title: titleIdx,
        cost: costIdx,
        price: priceIdx,
        weight: weightIdx,
        minMargin: marginIdx,
        commission: commIdx,
      };
    }
  }

  if (headerRowIndex === -1 || (cols.sku === -1 && cols.marketplaceId === -1 && cols.price === -1)) {
    return {
      rows: [],
      errors: [
        'Cabeçalho não reconhecido. Inclua colunas como SKU, ID Marketplace, Canal, Custo e Preço Praticado.',
      ],
    };
  }

  const parsedRows: ParsedAutoPriceRow[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const sku = cols.sku !== -1 ? String(row[cols.sku] || '').trim() : '';
    const marketplaceId =
      cols.marketplaceId !== -1 ? String(row[cols.marketplaceId] || '').trim() : '';
    const title = cols.title !== -1 ? String(row[cols.title] || '').trim() : '';
    const rawChannel = cols.channel !== -1 ? String(row[cols.channel] || '').trim() : '';
    const cost = cols.cost !== -1 ? parseNumber(row[cols.cost]) : undefined;
    const price = cols.price !== -1 ? parseNumber(row[cols.price]) : undefined;
    const weight = cols.weight !== -1 ? parseWeight(row[cols.weight]) : undefined;
    const minMargin = cols.minMargin !== -1 ? parsePercentCell(row[cols.minMargin]) : undefined;
    const commission = cols.commission !== -1 ? parsePercentCell(row[cols.commission]) : undefined;

    if (!sku && !marketplaceId && !title && (price === undefined || price <= 0)) {
      continue;
    }

    parsedRows.push({
      sku: sku || marketplaceId || `ITEM-${r}`,
      marketplaceId: marketplaceId || sku || '',
      title: title || `Produto ${sku || marketplaceId || r}`,
      channel: normalizeChannelString(rawChannel, defaultChannel),
      cost: cost !== undefined && cost > 0 ? cost : undefined,
      weightKg: weight !== undefined && weight >= 0.001 ? weight : defaultWeightKg,
      currentPrice: price !== undefined && price > 0 ? price : undefined,
      minMarginOverride: minMargin,
      commissionOverride: commission,
    });
  }

  if (parsedRows.length === 0) {
    errors.push('Nenhuma linha válida foi encontrada na planilha.');
  }

  return { rows: parsedRows, errors };
}

/**
 * Mescla ou importa linhas de planilha na lista de conferência,
 * atualizando preços praticados por ID do Marketplace ou SKU + Canal.
 */
export function mergeAutoPriceRows(
  existingItems: AutoPriceRawItem[],
  incomingRows: ParsedAutoPriceRow[],
  mode: 'merge' | 'replace',
  defaultWeightKg: number
): { items: AutoPriceRawItem[]; updatedCount: number; addedCount: number } {
  const nowIso = new Date().toISOString();
  const baseItems: AutoPriceRawItem[] = mode === 'replace' ? [] : [...existingItems];
  let updatedCount = 0;
  let addedCount = 0;

  for (let i = 0; i < incomingRows.length; i++) {
    const incoming = incomingRows[i];
    const normSku = incoming.sku.trim().toUpperCase();
    const normMktId = incoming.marketplaceId.trim().toUpperCase();

    const matchIndex = baseItems.findIndex((existing) => {
      if (existing.channel !== incoming.channel) return false;
      if (normMktId && existing.marketplaceId.trim().toUpperCase() === normMktId) return true;
      if (normSku && existing.sku.trim().toUpperCase() === normSku) return true;
      return false;
    });

    if (matchIndex !== -1) {
      const current = baseItems[matchIndex];
      baseItems[matchIndex] = {
        ...current,
        marketplaceId: incoming.marketplaceId || current.marketplaceId,
        title: incoming.title || current.title,
        cost: incoming.cost !== undefined ? incoming.cost : current.cost,
        weightKg: incoming.weightKg !== undefined ? incoming.weightKg : current.weightKg,
        currentPrice:
          incoming.currentPrice !== undefined ? incoming.currentPrice : current.currentPrice,
        minMarginOverride:
          incoming.minMarginOverride !== undefined
            ? incoming.minMarginOverride
            : current.minMarginOverride,
        commissionOverride:
          incoming.commissionOverride !== undefined
            ? incoming.commissionOverride
            : current.commissionOverride,
        lastUpdatedAt: nowIso,
        syncSource: 'planilha',
      };
      updatedCount++;
    } else {
      baseItems.push({
        id: `auto-${Date.now()}-${i}-${incoming.channel}-${incoming.sku}`,
        sku: incoming.sku,
        marketplaceId: incoming.marketplaceId,
        title: incoming.title,
        channel: incoming.channel,
        cost: incoming.cost ?? 0,
        weightKg: incoming.weightKg ?? defaultWeightKg,
        currentPrice: incoming.currentPrice ?? 0,
        minMarginOverride: incoming.minMarginOverride,
        commissionOverride: incoming.commissionOverride,
        lastUpdatedAt: nowIso,
        syncSource: 'planilha',
      });
      addedCount++;
    }
  }

  return { items: baseItems, updatedCount, addedCount };
}

/**
 * Gera planilha XLSX modelo com os 3 marketplaces (Mercado Livre, Shopee e TikTok Shop)
 * incluindo identificador por marketplace para conferência automática.
 */
export function generateSampleAutoPriceWorkbook(): XLSX.WorkBook {
  const sampleData = [
    {
      SKU: 'FONE-TWS-PRO',
      'ID Marketplace': 'MLB3849201120',
      Canal: 'Mercado Livre Clássico',
      Título: 'Fone Bluetooth TWS Cancelamento Ruído',
      'Custo (R$)': 38.0,
      'Peso (kg)': 0.25,
      'Preço Praticado (R$)': 89.9,
      'Margem Mínima (%)': 17,
    },
    {
      SKU: 'KIT-GARRAFA-TERM',
      'ID Marketplace': 'MLB4192004511',
      Canal: 'Mercado Livre Premium',
      Título: 'Garrafa Térmica Inox 1L Parede Dupla',
      'Custo (R$)': 42.0,
      'Peso (kg)': 0.65,
      'Preço Praticado (R$)': 79.9,
      'Margem Mínima (%)': 17,
    },
    {
      SKU: 'ORGANIZADOR-MAKE',
      'ID Marketplace': 'SHP-99401283',
      Canal: 'Shopee',
      Título: 'Organizador Acrílico Giratório 360',
      'Custo (R$)': 22.0,
      'Peso (kg)': 0.8,
      'Preço Praticado (R$)': 49.9,
      'Margem Mínima (%)': 17,
    },
    {
      SKU: 'LUMINARIA-LED-USB',
      'ID Marketplace': 'TTK-77291044',
      Canal: 'TikTok Shop',
      Título: 'Luminária LED Touch Recarregável Mesa',
      'Custo (R$)': 19.5,
      'Peso (kg)': 0.3,
      'Preço Praticado (R$)': 28.9,
      'Margem Mínima (%)': 15,
    },
    {
      SKU: 'CAPA-MAGSAFE-IP15',
      'ID Marketplace': 'TTK-88120394',
      Canal: 'TikTok Shop',
      Título: 'Capa Magnética Translúcida Premium',
      'Custo (R$)': 12.0,
      'Peso (kg)': 0.12,
      'Preço Praticado (R$)': 59.9,
      'Margem Mínima (%)': 15,
    },
    {
      SKU: 'MOCHILA-ANTI-FURTO',
      'ID Marketplace': 'SHP-55391021',
      Canal: 'Shopee',
      Título: 'Mochila Executiva Impermeável USB',
      'Custo (R$)': 54.0,
      'Peso (kg)': 1.1,
      'Preço Praticado (R$)': 119.9,
      'Margem Mínima (%)': 17,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Conferencia Automatica');
  return wb;
}

import * as XLSX from 'xlsx';
import { getMercadoLivreShippingFee, parseNumber, parseWeight } from './calculator';

export type MLBatchStatus = 'saudavel' | 'alerta' | 'prejuizo';

export interface MLBatchItem {
  id: string;
  sku: string;
  titulo: string;
  estoque: number;
  precoAtual: number;
  tarifaVendaPercent: number; // e.g., 14 for 14%
  pesoKg: number;
  custo: number;

  // Calculated values
  comissaoValor: number;
  freteTaxaValor: number;
  impostoValor: number;
  lucroBruto: number;
  margemRealPercent: number;
  precoSugerido: number;
  pontoEquilibrio: number;
  status: MLBatchStatus;
}

export interface MLBatchParams {
  taxPercent: number;
  targetMarginPercent: number;
  defaultCommission: number;
}

/**
 * Normaliza strings para busca e correspondência de cabeçalhos sem acentos e minúsculas
 */
export function normalizeHeader(str: string): string {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Converte valor de tarifa percentual de qualquer formato:
 * "14%", "14,00%", 0.14 (decimal do Excel), ou 14.
 */
export function parseTariffValue(val: any, fallback: number): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') {
    if (val > 0 && val <= 1) {
      return Math.round(val * 10000) / 100; // 0.14 -> 14
    }
    return val;
  }
  const cleanStr = val.toString().trim().replace('%', '').replace(',', '.');
  const num = parseFloat(cleanStr);
  if (isNaN(num) || num <= 0) return fallback;
  if (num > 0 && num <= 1) return Math.round(num * 10000) / 100;
  return num;
}

/**
 * Calcula o Preço Mínimo / Sugerido do Mercado Livre para atingir a Margem Meta.
 * Leva em consideração a dependência do frete oficial em relação à faixa de preço final atingida.
 */
export function calculateMLSuggestedPrice(
  cost: number,
  tariffPercent: number,
  weightKg: number,
  taxPercent: number,
  targetMarginPercent: number
): number {
  if (cost <= 0) return 0;

  const marginRate = targetMarginPercent / 100;
  const commissionRate = tariffPercent / 100;
  const taxRate = taxPercent / 100;
  const totalDeductionRate = marginRate + commissionRate + taxRate;

  if (1 - totalDeductionRate <= 0.005) {
    return 0; // Margem inatingível (soma das taxas >= 100%)
  }

  // Estimativa inicial
  let price = (cost + getMercadoLivreShippingFee(cost, weightKg)) / (1 - totalDeductionRate);
  const MAX_ITERATIONS = 15;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const shippingFee = getMercadoLivreShippingFee(price, weightKg);
    const newPrice = (cost + shippingFee) / (1 - totalDeductionRate);

    if (Math.abs(newPrice - price) < 0.01) {
      price = newPrice;
      break;
    }
    price = newPrice;
  }

  return Math.max(0, Math.round(price * 100) / 100);
}

/**
 * Calcula o Ponto de Equilíbrio (Margem zero, Lucro Bruto = R$ 0,00).
 */
export function calculateMLBreakEvenPrice(
  cost: number,
  tariffPercent: number,
  weightKg: number,
  taxPercent: number
): number {
  if (cost <= 0) return 0;

  const commissionRate = tariffPercent / 100;
  const taxRate = taxPercent / 100;
  const totalDeductionRate = commissionRate + taxRate;

  if (1 - totalDeductionRate <= 0.005) {
    return 0;
  }

  let price = (cost + getMercadoLivreShippingFee(cost, weightKg)) / (1 - totalDeductionRate);
  const MAX_ITERATIONS = 15;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const shippingFee = getMercadoLivreShippingFee(price, weightKg);
    const newPrice = (cost + shippingFee) / (1 - totalDeductionRate);

    if (Math.abs(newPrice - price) < 0.01) {
      price = newPrice;
      break;
    }
    price = newPrice;
  }

  return Math.max(0, Math.round(price * 100) / 100);
}

/**
 * Calcula os indicadores completos de um item do Mercado Livre.
 */
export function calculateMLItem(
  base: {
    id: string;
    sku: string;
    titulo: string;
    estoque: number;
    precoAtual: number;
    tarifaVendaPercent: number;
    pesoKg: number;
    custo: number;
  },
  params: MLBatchParams
): MLBatchItem {
  const preco = Math.max(0, base.precoAtual);
  const tarifaPercent = Math.max(0, base.tarifaVendaPercent || params.defaultCommission);
  const peso = base.pesoKg > 0 ? base.pesoKg : 1;
  const custo = Math.max(0, base.custo);
  const impostoPercent = Math.max(0, params.taxPercent);
  const margemMetaPercent = params.targetMarginPercent;

  // 1. Comissão ML (R$)
  const comissaoValor = preco * (tarifaPercent / 100);

  // 2. Frete / Taxa ML (R$) aplicando regras oficiais de faixas de preço e peso
  const freteTaxaValor = getMercadoLivreShippingFee(preco, peso);

  // 3. Imposto (R$)
  const impostoValor = preco * (impostoPercent / 100);

  // 4. Lucro Bruto (R$)
  const lucroBruto = preco - custo - freteTaxaValor - comissaoValor - impostoValor;

  // 5. Margem Real (%)
  const margemRealPercent = preco > 0 ? (lucroBruto / preco) * 100 : 0;

  // 6. Preço Mínimo / Sugerido (R$)
  const precoSugerido = calculateMLSuggestedPrice(custo, tarifaPercent, peso, impostoPercent, margemMetaPercent);

  // 7. Ponto de Equilíbrio (R$)
  const pontoEquilibrio = calculateMLBreakEvenPrice(custo, tarifaPercent, peso, impostoPercent);

  // 8. Status do Anúncio
  // 🟢 Saudável: Margem Real ≥ Margem Meta.
  // 🟡 Alerta: Margem Real > 0% e < Margem Meta.
  // 🔴 Prejuízo: Margem Real ≤ 0% (abaixo do Ponto de Equilíbrio).
  let status: MLBatchStatus = 'saudavel';
  if (margemRealPercent <= 0) {
    status = 'prejuizo';
  } else if (margemRealPercent < margemMetaPercent) {
    status = 'alerta';
  } else {
    status = 'saudavel';
  }

  return {
    ...base,
    tarifaVendaPercent: tarifaPercent,
    pesoKg: peso,
    custo,
    comissaoValor: Math.round(comissaoValor * 100) / 100,
    freteTaxaValor: Math.round(freteTaxaValor * 100) / 100,
    impostoValor: Math.round(impostoValor * 100) / 100,
    lucroBruto: Math.round(lucroBruto * 100) / 100,
    margemRealPercent: Math.round(margemRealPercent * 100) / 100,
    precoSugerido,
    pontoEquilibrio,
    status
  };
}

/**
 * Lê e analisa a planilha do Mercado Livre (.xlsx, .xls, .csv).
 * Localiza inteligentemente as colunas: SKU, Título, Estoque, Preço, Tarifa de Venda e Peso.
 */
export function parseMercadoLivreWorkbook(
  workbook: XLSX.WorkBook,
  params: MLBatchParams
): { items: MLBatchItem[]; errors: string[] } {
  const errors: string[] = [];
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { items: [], errors: ['A planilha não contém nenhuma aba ou dados.'] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rows || rows.length === 0) {
    return { items: [], errors: ['A planilha está vazia.'] };
  }

  // Encontra a linha de cabeçalho mais adequada examinando as primeiras 15 linhas
  let headerRowIndex = -1;
  let bestScore = 0;
  let colIndices = {
    sku: -1,
    titulo: -1,
    estoque: -1,
    preco: -1,
    tarifa: -1,
    peso: -1,
    custo: -1
  };

  const maxHeaderSearchRows = Math.min(15, rows.length);

  for (let r = 0; r < maxHeaderSearchRows; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    let skuIdx = -1;
    let tituloIdx = -1;
    let estoqueIdx = -1;
    let precoIdx = -1;
    let tarifaIdx = -1;
    let pesoIdx = -1;
    let custoIdx = -1;
    let score = 0;

    for (let c = 0; c < row.length; c++) {
      const cellText = normalizeHeader(String(row[c] || ''));
      if (!cellText) continue;

      // 1. SKU
      if (
        skuIdx === -1 &&
        (cellText === 'sku' ||
          cellText === 'codigo sku' ||
          cellText.includes('sku') ||
          cellText === 'codigo do anuncio' ||
          cellText === 'identificador' ||
          cellText === 'codigo')
      ) {
        skuIdx = c;
        score += 3;
      }

      // 2. Título
      if (
        tituloIdx === -1 &&
        (cellText.includes('titulo') ||
          cellText.includes('anuncio') ||
          cellText.includes('descricao') ||
          cellText === 'nome' ||
          cellText === 'produto')
      ) {
        tituloIdx = c;
        score += 2;
      }

      // 3. Estoque
      if (
        estoqueIdx === -1 &&
        (cellText.includes('estoque') ||
          cellText.includes('deposito') ||
          cellText.includes('quantidade') ||
          cellText.includes('disponivel') ||
          cellText === 'qtd')
      ) {
        estoqueIdx = c;
        score += 2;
      }

      // 4. Preço
      if (
        precoIdx === -1 &&
        (cellText === 'preco' ||
          cellText === 'preco atual' ||
          cellText === 'preco de venda' ||
          cellText === 'preco unitario' ||
          cellText.includes('preco') ||
          cellText === 'valor')
      ) {
        precoIdx = c;
        score += 3;
      }

      // 5. Tarifa de venda
      if (
        tarifaIdx === -1 &&
        (cellText.includes('tarifa') ||
          cellText.includes('comissao') ||
          cellText.includes('aliquota') ||
          cellText.includes('taxa de venda'))
      ) {
        tarifaIdx = c;
        score += 2;
      }

      // 6. Peso físico (kg)
      if (
        pesoIdx === -1 &&
        (cellText.includes('peso') || cellText.includes('kg') || cellText.includes('grama'))
      ) {
        pesoIdx = c;
        score += 2;
      }

      // 7. Custo do produto (última coluna ou identificada por nome)
      if (
        custoIdx === -1 &&
        (cellText === 'custo do produto' ||
          cellText === 'custo' ||
          cellText === 'preco de custo' ||
          cellText === 'valor de custo' ||
          cellText === 'custo unitario' ||
          cellText === 'custo (r$)' ||
          cellText.includes('custo'))
      ) {
        custoIdx = c;
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = r;
      colIndices = { sku: skuIdx, titulo: tituloIdx, estoque: estoqueIdx, preco: precoIdx, tarifa: tarifaIdx, peso: pesoIdx, custo: custoIdx };
    }
  }

  // Se a coluna de custo não foi identificada por nome, mas o cabeçalho possui mais de 6 colunas,
  // e a última coluna não corresponde a nenhuma das outras colunas mapeadas, assume a última coluna como Custo do Produto
  if (headerRowIndex !== -1 && colIndices.custo === -1 && rows[headerRowIndex]) {
    const headerCols = rows[headerRowIndex];
    if (Array.isArray(headerCols) && headerCols.length >= 7) {
      const lastIndex = headerCols.length - 1;
      const alreadyMapped = [
        colIndices.sku,
        colIndices.titulo,
        colIndices.estoque,
        colIndices.preco,
        colIndices.tarifa,
        colIndices.peso
      ];
      if (!alreadyMapped.includes(lastIndex)) {
        colIndices.custo = lastIndex;
      }
    }
  }

  if (headerRowIndex === -1 || (colIndices.preco === -1 && colIndices.sku === -1)) {
    return {
      items: [],
      errors: [
        'Não foi possível identificar o cabeçalho da planilha. Certifique-se de que contenha as colunas de Preço, SKU, Tarifa e Peso.'
      ]
    };
  }

  const items: MLBatchItem[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const rawSku = colIndices.sku !== -1 ? String(row[colIndices.sku] || '').trim() : '';
    const rawTitulo = colIndices.titulo !== -1 ? String(row[colIndices.titulo] || '').trim() : '';
    const rawEstoque = colIndices.estoque !== -1 ? parseNumber(row[colIndices.estoque]) : 1;
    const rawPreco = colIndices.preco !== -1 ? parseNumber(row[colIndices.preco]) : 0;
    const rawTarifa = colIndices.tarifa !== -1 ? parseTariffValue(row[colIndices.tarifa], params.defaultCommission) : params.defaultCommission;
    const rawPeso = colIndices.peso !== -1 ? parseWeight(row[colIndices.peso]) : 1;
    const rawCusto = colIndices.custo !== -1 ? parseNumber(row[colIndices.custo]) : 0;

    // Se a linha não tiver nem SKU nem preço válido, pula linha vazia
    if (!rawSku && rawPreco <= 0 && !rawTitulo) continue;

    const sku = rawSku || `MLB-${r - headerRowIndex}`;
    const titulo = rawTitulo || `Anúncio ${sku}`;
    const estoque = Math.max(0, Math.round(rawEstoque));
    const preco = Math.max(0, rawPreco);
    const tarifa = rawTarifa > 0 ? rawTarifa : params.defaultCommission;
    const peso = rawPeso > 0 ? rawPeso : 1;
    const custo = Math.max(0, rawCusto);

    const base = {
      id: `ml-item-${r}-${sku}`,
      sku,
      titulo,
      estoque,
      precoAtual: preco,
      tarifaVendaPercent: tarifa,
      pesoKg: peso,
      custo // Carrega automaticamente da última coluna "Custo do Produto" se presente na planilha, ou 0
    };

    items.push(calculateMLItem(base, params));
  }

  if (items.length === 0) {
    errors.push('Nenhum anúncio válido com preço ou SKU foi encontrado na planilha.');
  }

  return { items, errors };
}

/**
 * Lê uma planilha ou arquivo CSV De-Para (SKU x Custo)
 * e retorna um mapa [SKU normalizado -> Custo R$]
 */
export function parseDeParaWorkbook(workbook: XLSX.WorkBook): {
  costMap: Map<string, number>;
  totalMatchedRows: number;
  errors: string[];
} {
  const costMap = new Map<string, number>();
  const errors: string[] = [];

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { costMap, totalMatchedRows: 0, errors: ['O arquivo De-Para está vazio.'] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rows || rows.length < 2) {
    return { costMap, totalMatchedRows: 0, errors: ['O arquivo De-Para precisa de pelo menos 2 linhas (cabeçalho e dados).'] };
  }

  let skuIdx = -1;
  let costIdx = -1;
  let headerRowIndex = 0;

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = normalizeHeader(String(row[c] || ''));
      if (skuIdx === -1 && (cell === 'sku' || cell.includes('sku') || cell === 'codigo' || cell === 'id' || cell === 'identificador')) {
        skuIdx = c;
      }
      if (costIdx === -1 && (cell.includes('custo') || cell.includes('preco de custo') || cell.includes('valor de custo'))) {
        costIdx = c;
      }
    }
    if (skuIdx !== -1 && costIdx !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback: se não achou pelos nomes, assume coluna 0 = SKU e coluna 1 = Custo
  if (skuIdx === -1) skuIdx = 0;
  if (costIdx === -1) costIdx = 1;

  let totalMatchedRows = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawSku = String(row[skuIdx] || '').trim();
    const rawCost = parseNumber(row[costIdx]);

    if (rawSku && rawCost >= 0) {
      const normalizedKey = rawSku.toUpperCase();
      costMap.set(normalizedKey, rawCost);
      totalMatchedRows++;
    }
  }

  if (totalMatchedRows === 0) {
    errors.push('Nenhuma correspondência válida de SKU e Custo foi encontrada no arquivo.');
  }

  return { costMap, totalMatchedRows, errors };
}

/**
 * Gera um arquivo XLSX modelo de exemplo para o usuário testar rapidamente
 */
export function generateSampleMercadoLivreWorkbook(): XLSX.WorkBook {
  const sampleData = [
    {
      'SKU': 'FONE-BT-01',
      'Título': 'Fone de Ouvido Bluetooth Sem Fio TWS Bateria Longa Duração',
      'Estoque no depósito': 35,
      'Preço': 59.90,
      'Tarifa de venda': '14%',
      'Peso físico (kg) / Produto dentro da embalagem': 0.25,
      'Custo do Produto': 18.50
    },
    {
      'SKU': 'SUPORTE-NOTE-ALU',
      'Título': 'Suporte Articulado Ergonômico para Notebook em Alumínio',
      'Estoque no depósito': 22,
      'Preço': 89.90,
      'Tarifa de venda': '14%',
      'Peso físico (kg) / Produto dentro da embalagem': 0.85,
      'Custo do Produto': 29.00
    },
    {
      'SKU': 'MOCHILA-EXEC-IMPERM',
      'Título': 'Mochila Executiva Reforçada Impermeável para Notebook 15.6',
      'Estoque no depósito': 18,
      'Preço': 139.90,
      'Tarifa de venda': '14%',
      'Peso físico (kg) / Produto dentro da embalagem': 1.20,
      'Custo do Produto': 42.00
    },
    {
      'SKU': 'SMARTWATCH-ULTRA-2',
      'Título': 'Smartwatch Relógio Inteligente Ultra 2 Monitor Cardíaco',
      'Estoque no depósito': 14,
      'Preço': 189.90,
      'Tarifa de venda': '19%',
      'Peso físico (kg) / Produto dentro da embalagem': 0.35,
      'Custo do Produto': 68.00
    },
    {
      'SKU': 'KIT-CABOS-USBC-3UN',
      'Título': 'Kit 3 Cabos USB Tipo-C Turbo 1 Metro Reforçado Trançado',
      'Estoque no depósito': 60,
      'Preço': 34.90,
      'Tarifa de venda': '12%',
      'Peso físico (kg) / Produto dentro da embalagem': 0.15,
      'Custo do Produto': 9.80
    },
    {
      'SKU': 'CAIXA-SOM-BOOM-20W',
      'Título': 'Caixa de Som Portátil Bluetooth 20W Resistente à Água IPX6',
      'Estoque no depósito': 8,
      'Preço': 219.00,
      'Tarifa de venda': '14%',
      'Peso físico (kg) / Produto dentro da embalagem': 2.10,
      'Custo do Produto': 79.00
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Anúncios Mercado Livre');
  return wb;
}

/**
 * Gera um arquivo XLSX modelo de De-Para de Custos para o usuário testar
 */
export function generateSampleDeParaWorkbook(): XLSX.WorkBook {
  const sampleData = [
    { 'SKU': 'FONE-BT-01', 'Custo': 18.50 },
    { 'SKU': 'SUPORTE-NOTE-ALU', 'Custo': 29.00 },
    { 'SKU': 'MOCHILA-EXEC-IMPERM', 'Custo': 42.00 },
    { 'SKU': 'SMARTWATCH-ULTRA-2', 'Custo': 68.00 },
    { 'SKU': 'KIT-CABOS-USBC-3UN', 'Custo': 9.80 },
    { 'SKU': 'CAIXA-SOM-BOOM-20W', 'Custo': 79.00 }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'De-Para Custos');
  return wb;
}

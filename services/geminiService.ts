
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings } from "../types";
import { getShopeeFeeComponents, calculateShopeePrice } from "../lib/calculator";

export interface ShopeeBatchResult {
  sku: string;
  descricao_produto: string;
  preco_venda_atual: number;
  margem_atual_porcentagem: number;
  novo_preco_venda: number;
  margem_novo_preco_porcentagem: number;
  precisa_de_reajuste: boolean;
  estoque: number;
  custo_produto: number;
  comissao_porcentagem: number;
  taxa_fixa: number;
}

interface ParsedProduct {
  sku: string;
  description: string;
  cost: number;
  stock: number;
  currentPrice: number;
}

/**
 * Corrige problemas comuns de caracteres corrompidos por encoding duplo (ex: UTF-8 lido como Latin1)
 */
function cleanDoubleUtf8(str: string): string {
  if (!str) return '';
  try {
    if (/Ã[\x80-\xBF]/.test(str)) {
      return decodeURIComponent(escape(str));
    }
  } catch {
    // fallback se falhar decodificação
  }
  return str
    .replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã/g, 'í');
}

/**
 * Converte strings numéricas em número, aceitando vírgulas brasileiras (ex: "22,36", "1.250,50", "R$ 54,90")
 */
function parseNumberValue(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  let cleaned = str.replace(/[R$\s]/g, '');
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Separa uma linha CSV/TSV respeitando aspas duplas
 */
function parseDelimitedRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result.map(token => {
    let t = token.trim();
    if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
      t = t.slice(1, -1).trim();
    }
    return t;
  });
}

/**
 * Detecta o delimitador mais provável (Tab, Ponto e vírgula ou Vírgula)
 */
function detectDelimiter(lines: string[]): string {
  let commaCount = 0;
  let semicolonCount = 0;
  let tabCount = 0;

  for (const line of lines.slice(0, 10)) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (char === '\t') tabCount++;
        else if (char === ';') semicolonCount++;
        else if (char === ',') commaCount++;
      }
    }
  }

  if (tabCount > 0 && tabCount >= semicolonCount && tabCount >= commaCount) return '\t';
  if (semicolonCount > 0 && semicolonCount >= commaCount) return ';';
  return ',';
}

function identifyColumnType(header: string): 'sku' | 'desc' | 'cost' | 'stock' | 'price' | 'unknown' {
  const h = cleanDoubleUtf8(header)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Preço de venda (ex: 'preço de venda atual', 'preço', 'pv', 'valor de venda', 'preço atual')
  if ((h.includes('prec') || h.includes('venda') || h.includes('atual') || h.includes('pv') || h.includes('price')) && !h.includes('cust') && !h.includes('compra')) {
    return 'price';
  }

  // Preço de custo (ex: 'custo', 'preço de custo', 'valor de custo', 'cost', 'compra')
  if (h.includes('cust') || h.includes('compra') || h.includes('cost')) {
    return 'cost';
  }

  // Estoque (ex: 'estoque', 'qtd', 'quantidade', 'stock', 'saldo', 'unid')
  if (h.includes('estoq') || h.includes('qtd') || h.includes('quant') || h.includes('stock') || h.includes('saldo') || h.includes('unid')) {
    return 'stock';
  }

  // Descrição do produto (ex: 'descrição', 'produto', 'nome', 'item', 'titulo')
  if (h.includes('desc') || h.includes('prod') || h.includes('nome') || h.includes('item') || h.includes('titul') || h.includes('name')) {
    return 'desc';
  }

  // SKU / Código (ex: 'sku', 'código', 'id', 'ref', 'referencia')
  if (h.includes('sku') || h.includes('codig') || h === 'cod' || h.startsWith('cod_') || h.startsWith('cod-') || h === 'id' || h.includes('ref')) {
    return 'sku';
  }

  return 'unknown';
}

/**
 * Faz o parsing de dados de produtos a partir de CSV, TSV, tabela colada do Excel ou JSON
 */
export function parseShopeeTextProducts(text: string): ParsedProduct[] {
  const trimmed = text.trim();

  // 1. Tentar como JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const result: ParsedProduct[] = [];
      for (const it of items) {
        if (typeof it !== 'object' || it === null) continue;
        const sku = String(it.sku || it.codigo || it.id || it.ref || '').trim();
        const description = cleanDoubleUtf8(String(it.descricao_produto || it.descricao || it.description || it.produto || it.nome || it.item || ''));
        const cost = parseNumberValue(it.custo_produto ?? it.custo ?? it.cost ?? it.valor_custo);
        const stock = Math.max(0, Math.round(parseNumberValue(it.estoque ?? it.stock ?? it.quantidade ?? it.qtd)));
        const currentPrice = parseNumberValue(it.preco_venda_atual ?? it.preco_atual ?? it.preco ?? it.price ?? it.pv);

        if (cost > 0 || currentPrice > 0) {
          result.push({ sku: sku || `SKU-${result.length + 1}`, description: description || 'Sem descrição', cost, stock, currentPrice });
        }
      }
      if (result.length > 0) return result;
    } catch {
      // continua para CSV/TSV
    }
  }

  // 2. CSV / TSV / Linhas delimitadas
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (rawLines.length === 0) return [];

  const delimiter = detectDelimiter(rawLines);
  const rows = rawLines.map(line => parseDelimitedRow(line, delimiter));
  if (rows.length === 0) return [];

  // Analisar cabeçalho na linha 0
  const headerRow = rows[0];

  let skuIdx = -1;
  let descIdx = -1;
  let costIdx = -1;
  let stockIdx = -1;
  let priceIdx = -1;

  headerRow.forEach((col, idx) => {
    const colType = identifyColumnType(col);
    if (colType === 'sku' && skuIdx === -1) skuIdx = idx;
    else if (colType === 'desc' && descIdx === -1) descIdx = idx;
    else if (colType === 'cost' && costIdx === -1) costIdx = idx;
    else if (colType === 'stock' && stockIdx === -1) stockIdx = idx;
    else if (colType === 'price' && priceIdx === -1) priceIdx = idx;
  });

  const recognizedCount = [skuIdx, descIdx, costIdx, stockIdx, priceIdx].filter(i => i !== -1).length;
  const isHeaderRow = recognizedCount >= 2;

  // Se não reconheceu cabeçalho, usar ordem padrão (SKU, Descrição, Custo, Estoque, Preço Atual)
  if (!isHeaderRow) {
    skuIdx = 0;
    descIdx = 1;
    costIdx = 2;
    stockIdx = 3;
    priceIdx = 4;
  }

  const startRow = isHeaderRow ? 1 : 0;
  const products: ParsedProduct[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0) continue;

    const sku = cleanDoubleUtf8(skuIdx !== -1 && row[skuIdx] ? row[skuIdx] : `SKU-${products.length + 1}`);
    const description = cleanDoubleUtf8(descIdx !== -1 && row[descIdx] ? row[descIdx] : 'Sem descrição');
    const cost = costIdx !== -1 && row[costIdx] !== undefined ? parseNumberValue(row[costIdx]) : 0;
    const stock = stockIdx !== -1 && row[stockIdx] !== undefined ? Math.max(0, Math.round(parseNumberValue(row[stockIdx]))) : 0;
    const currentPrice = priceIdx !== -1 && row[priceIdx] !== undefined ? parseNumberValue(row[priceIdx]) : 0;

    if (cost > 0 || currentPrice > 0) {
      products.push({ sku, description, cost, stock, currentPrice });
    }
  }

  return products;
}

/**
 * Realiza o cálculo em lote determinístico da Shopee com as regras oficiais 2026
 */
export function calculateLocalShopeeBatch(
  productsData: string,
  settings: AppSettings
): ShopeeBatchResult[] {
  const products = parseShopeeTextProducts(productsData);
  if (products.length === 0) return [];

  const taxPercent = settings.simplesNacional / 100;
  const desiredMarginPercent = settings.shopee.contributionMargin;

  return products.map(item => {
    const currentPrice = item.currentPrice;
    const cost = item.cost;
    const stock = item.stock;

    // 1. Taxas Shopee para o preço atual
    const currentFees = getShopeeFeeComponents(currentPrice, settings);
    const commissionPercent = currentFees.commissionPercent * 100;
    const fixedFee = currentFees.fixedFee;

    // 2. Lucro bruto e margem atual
    const commissionValue = currentPrice * currentFees.commissionPercent;
    const taxValue = currentPrice * taxPercent;
    const grossProfit = currentPrice - cost - fixedFee - commissionValue - taxValue;
    const currentMarginPercent = currentPrice > 0 ? (grossProfit / currentPrice) * 100 : 0;

    // 3. Verificação de reajuste necessário
    const needsAdjustment = currentMarginPercent < (desiredMarginPercent - 0.05);

    let newPrice = currentPrice;
    let newMarginPercent = currentMarginPercent;

    if (needsAdjustment && cost > 0) {
      const idealCalc = calculateShopeePrice(cost, settings);
      newPrice = Math.round(idealCalc.finalPrice * 100) / 100;
      newMarginPercent = idealCalc.calculatedMargin;
    }

    return {
      sku: item.sku,
      descricao_produto: item.description,
      preco_venda_atual: currentPrice,
      margem_atual_porcentagem: Math.round(currentMarginPercent * 100) / 100,
      novo_preco_venda: newPrice,
      margem_novo_preco_porcentagem: Math.round(newMarginPercent * 100) / 100,
      precisa_de_reajuste: needsAdjustment,
      estoque: stock,
      custo_produto: cost,
      comissao_porcentagem: Math.round(commissionPercent * 100) / 100,
      taxa_fixa: fixedFee,
    };
  });
}

export async function runShopeeBatchConference(
  productsData: string,
  settings: AppSettings
): Promise<ShopeeBatchResult[]> {
  // 1. Processamento local determinístico imediato (100% preciso e sem depender de chaves externas)
  const localResults = calculateLocalShopeeBatch(productsData, settings);
  if (localResults.length > 0) {
    return localResults;
  }

  // 2. Fallback de IA caso os dados não estejam estruturados em colunas e haja chave configurada
  const apiKey = (import.meta as any).env?.VITE_CALC_PREC_FAC || (import.meta as any).env?.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("Nenhum produto foi reconhecido. Verifique se os dados estão organizados com SKU, Descrição, Custo, Estoque e Preço de Venda Atual (separados por vírgula, ponto e vírgula ou colados do Excel).");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const shopeeSettings = settings.shopee;
    const tax = settings.simplesNacional;

    const systemInstruction = `
Você é o motor de cálculo e análise da ferramenta "Precifica Fácil". Sua função é realizar a conferência de preços em lote para produtos vendidos na plataforma Shopee.

Você receberá:
1. CONFIGURAÇÕES: Taxas da plataforma, impostos e a Margem de Contribuição mínima desejada.
2. DADOS: Uma lista de produtos com SKU, Descrição, Custo, Estoque e Preço de Venda Atual.

REGRAS DE CÁLCULO (OBRIGATÓRIO SEGUIR EXATAMENTE):
1. DEFINIÇÃO DE COMISSÃO E TAXA FIXA (SHOPEE):
   - Se Vendedor for "CPF" E Preço de Venda < R$ 12,00: Comissão Base = 25% | Taxa Fixa = R$ 4,50
   - Demais casos:
     - Se PV <= R$ 79,99: Comissão Base = 20% | Taxa Fixa = R$ 4,50
     - Se PV entre R$ 80,00 e R$ 99,99: Comissão Base = 14% | Taxa Fixa = R$ 16,00
     - Se PV entre R$ 100,00 e R$ 199,99: Comissão Base = 14% | Taxa Fixa = R$ 20,00
     - Se PV entre R$ 200,00 e R$ 499,99: Comissão Base = 14% | Taxa Fixa = R$ 26,00
     - Se PV >= R$ 500,00: Comissão Base = 14% | Taxa Fixa = R$ 26,00
   - Ajustes:
     - Se Vendedor for "CNPJ" E PV < R$ 8,00: Taxa Fixa = PV * 0,50.
     - Se "CPF Alto Volume" for "Sim" E Vendedor for "CPF": +R$ 3,00 na Taxa Fixa (exceto regra < R$ 12).
     - Se "Em Campanha" for "Sim": +2,5% na comissão.
2. FÓRMULAS:
   - Margem Bruta (R$) = PV - Custo - Taxa Fixa - (PV * % Comissão) - (PV * % Imposto)
   - Margem (%) = (Margem Bruta / PV) * 100
3. NOVO PREÇO:
   - Se Margem Atual < Margem Desejada: calcule o Novo Preço que resulte na Margem Desejada.
   - Se Margem Atual >= Margem Desejada: Novo Preço = Preço Atual.

Retorne EXCLUSIVAMENTE um array JSON com os campos: sku, descricao_produto, preco_venda_atual, margem_atual_porcentagem, novo_preco_venda, margem_novo_preco_porcentagem, precisa_de_reajuste, estoque, custo_produto, comissao_porcentagem, taxa_fixa.
`;

    const configPrompt = `
CONFIGURAÇÕES:
- Imposto (Simples Nacional): ${tax}%
- Margem de Contribuição Desejada: ${shopeeSettings.contributionMargin}%
- Tipo de Vendedor: ${shopeeSettings.sellerType}
- Em Campanha: ${shopeeSettings.inCampaign ? "Sim" : "Não"}
- CPF Alto Volume: ${shopeeSettings.highVolumeCPF ? "Sim" : "Não"}

DADOS:
${productsData}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: configPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sku: { type: Type.STRING },
              descricao_produto: { type: Type.STRING },
              preco_venda_atual: { type: Type.NUMBER },
              margem_atual_porcentagem: { type: Type.NUMBER },
              novo_preco_venda: { type: Type.NUMBER },
              margem_novo_preco_porcentagem: { type: Type.NUMBER },
              precisa_de_reajuste: { type: Type.BOOLEAN },
              estoque: { type: Type.NUMBER },
              custo_produto: { type: Type.NUMBER },
              comissao_porcentagem: { type: Type.NUMBER },
              taxa_fixa: { type: Type.NUMBER },
            },
            required: [
              "sku",
              "descricao_produto",
              "preco_venda_atual",
              "margem_atual_porcentagem",
              "novo_preco_venda",
              "margem_novo_preco_porcentagem",
              "precisa_de_reajuste",
              "estoque",
              "custo_produto",
              "comissao_porcentagem",
              "taxa_fixa",
            ],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Gemini batch fallback error:", err);
    throw new Error("Não foi possível processar os dados inseridos. Por favor, verifique se estão no formato de tabela (SKU, Descrição, Custo, Estoque e Preço de Venda Atual).");
  }
}


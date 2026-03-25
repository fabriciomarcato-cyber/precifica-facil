
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings } from "../types";

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

export async function runShopeeBatchConference(
  productsData: string,
  settings: AppSettings
): Promise<ShopeeBatchResult[]> {
  // Use the specific VITE_CALC_PREC_FAC key via import.meta.env
  const apiKey = (import.meta as any).env.VITE_CALC_PREC_FAC || (import.meta as any).env.VITE_API_KEY;
  
  if (!apiKey || apiKey === "") {
    throw new Error("Configuração do servidor incompleta (API Key). Por favor, contate o administrador.");
  }

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
   A base de cálculo depende do Preço de Venda (PV) e do Tipo de Vendedor.

   A) REGRA ESPECIAL CPF BAIXO VALOR:
      - Se Vendedor for "CPF" E Preço de Venda < R$ 12,00:
        Comissão Base = 25%
        Taxa Fixa = R$ 4,00
        (Nesta regra específica, NÃO se adiciona a taxa de R$ 3,00 de Alto Volume, mesmo que esteja ativa).

   B) REGRA GERAL (Demais casos):
      - Se PV <= R$ 79,99: Comissão Base = 20% | Taxa Fixa = R$ 4,00
      - Se PV entre R$ 80,00 e R$ 99,99: Comissão Base = 14% | Taxa Fixa = R$ 16,00
      - Se PV entre R$ 100,00 e R$ 199,99: Comissão Base = 14% | Taxa Fixa = R$ 20,00
      - Se PV entre R$ 200,00 e R$ 499,99: Comissão Base = 14% | Taxa Fixa = R$ 26,00
      - Se PV >= R$ 500,00: Comissão Base = 14% | Taxa Fixa = R$ 26,00

   C) AJUSTES SOBRE A REGRA GERAL (Não se aplica à Regra A):
      - Se Vendedor for "CNPJ" E PV < R$ 8,00: A Taxa Fixa de R$ 4,00 é SUBSTITUÍDA por (PV * 0,50).
      - Se "CPF Alto Volume" for "Sim" E Vendedor for "CPF": Adicione +R$ 3,00 na Taxa Fixa (Totalizando R$ 7,00 na faixa inicial).

   D) ADICIONAL DE CAMPANHA (Aplica-se a TODOS os casos A e B):
      - Se "Em Campanha" for "Sim": Adicione +2,5% na porcentagem de comissão final.

2. FÓRMULAS DE CÁLCULO:
   - Margem Bruta (R$) = Preço de Venda - Custo do Produto - Taxa Fixa - (Preço de Venda * % Comissão Final) - (Preço de Venda * % Imposto)
   - Margem (%) = (Margem Bruta / Preço de Venda) * 100

3. CÁLCULO DO NOVO PREÇO:
   Se a Margem (%) Atual for menor que a Margem Desejada:
   - Você deve encontrar o Novo Preço de Venda que resulte na Margem Desejada.
   - Como as taxas mudam conforme o preço, use a fórmula: Novo Preço = (Custo + Taxa Fixa) / (1 - %MargemDesejada - %ComissãoFinal - %Imposto).
   - Verifique se o novo preço calculado altera a faixa de Taxa Fixa/Comissão. Se alterar, recalcule usando os valores da nova faixa até estabilizar.

4. EXEMPLO DE CÁLCULO (PARA SUA REFERÊNCIA):
   Custo: 32.65 | Preço Atual: 55.99 | Imposto: 4% | Margem Desejada: 15%
   - Faixa: <= 79.99 -> Comissão: 20%, Taxa Fixa: 4.00
   - Comissão Final: 20% (ou 22.5% se em campanha)
   - Margem Bruta Atual = 55.99 - 32.65 - 4.00 - (55.99 * 0.20) - (55.99 * 0.04)
   - Margem Bruta Atual = 55.99 - 32.65 - 4.00 - 11.20 - 2.24 = 5.90
   - Margem (%) Atual = (5.90 / 55.99) * 100 = 10.54%
   - Como 10.54% < 15%, precisa de reajuste.
   - Novo Preço = (32.65 + 4.00) / (1 - 0.15 - 0.20 - 0.04) = 36.65 / 0.61 = 60.08
   - Margem Novo Preço = (60.08 - 32.65 - 4.00 - 12.02 - 2.40) / 60.08 = 9.01 / 60.08 = 15.00%

Sua tarefa para CADA produto:
- Identificar os valores corretos de Comissão e Taxa Fixa para o Preço Atual.
- Calcular a Margem Atual (%) com precisão matemática.
- Se Margem Atual < Margem Desejada, calcular o Novo Preço de Venda necessário.
- Se Margem Atual >= Margem Desejada, o Novo Preço é igual ao Atual.
- Calcular a Margem do Novo Preço (deve ser >= Margem Desejada).

IMPORTANTE SOBRE OS DADOS:
- Os dados podem estar separados por vírgulas (CSV), tabulações ou múltiplos espaços.
- Se os dados NÃO possuírem cabeçalho, assuma obrigatoriamente a ordem das colunas como: SKU, Descrição, Custo, Estoque, Preço de Venda Atual.
- Se houver cabeçalho, use-o para identificar as informações corretamente.
- Ignore linhas vazias ou dados incompletos.

DIRETRIZES DE SAÍDA:
Retorne EXCLUSIVAMENTE um array JSON.
Campos: sku, descricao_produto, preco_venda_atual, margem_atual_porcentagem, novo_preco_venda, margem_novo_preco_porcentagem, precisa_de_reajuste (bool), estoque, custo_produto, comissao_porcentagem, taxa_fixa.
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
    model: "gemini-3-flash-preview",
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

  try {
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    return [];
  }
}

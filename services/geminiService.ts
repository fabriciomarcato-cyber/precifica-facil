
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
}

export async function runShopeeBatchConference(
  productsData: string,
  settings: AppSettings
): Promise<ShopeeBatchResult[]> {
  // Check multiple possible locations for the API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey || apiKey === "") {
    throw new Error("A chave da API Gemini não foi encontrada. Por favor, configure a chave no menu 'Settings' ou selecione uma chave válida.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const shopeeSettings = settings.shopee;
  const tax = settings.simplesNacional;

  const systemInstruction = `
Você é o motor de cálculo e análise da ferramenta "Precifica Fácil". Sua função é realizar a conferência de preços em lote para produtos vendidos na plataforma Shopee.

Você receberá:
1. CONFIGURAÇÕES: Taxas da plataforma, impostos e a Margem de Contribuição mínima desejada.
2. DADOS: Uma lista de produtos com SKU, Descrição, Preço Atual, Estoque e Custo.

REGRAS DE CÁLCULO (OBRIGATÓRIO SEGUIR):
1. DESCONTOS DA PLATAFORMA (SHOPEE):
   - Se o Preço de Venda for até R$ 79,99: Comissão = 20% + Taxa Fixa = R$ 4,00.
   - Se o Preço de Venda for entre R$ 80,00 e R$ 99,99: Comissão = 14% + Taxa Fixa = R$ 16,00.
   - Se o Preço de Venda for entre R$ 100,00 e R$ 199,99: Comissão = 14% + Taxa Fixa = R$ 20,00.
   - Se o Preço de Venda for entre R$ 200,00 e R$ 499,99: Comissão = 14% + Taxa Fixa = R$ 26,00.
   - Se o Preço de Venda for R$ 500,00 ou mais: Comissão = 14% + Taxa Fixa = R$ 26,00.

2. ADICIONAIS:
   - Se "Em Campanha" for "Sim": Adicione +2,5% na porcentagem de comissão.
   - Se "CPF Alto Volume" for "Sim": Adicione R$ 3,00 na Taxa Fixa.
   - Se Vendedor for "CNPJ" e Preço < R$ 8,00: Taxa Fixa = Preço * 0,50.

Sua tarefa para CADA produto:
- Calcular os custos totais (Comissão + Taxa Fixa + Impostos + Custo do Produto) sobre o Preço Atual.
- Encontrar a Margem Atual (%).
- Comparar a Margem Atual com a Margem Mínima Desejada.
- Se a Margem Atual for menor que a desejada, calcular o "Novo Preço de Venda" necessário para atingir exatamente a Margem Mínima Desejada. Caso contrário, o Novo Preço de Venda será igual ao atual.
- Calcular a Margem do Novo Preço de Venda (que deve bater com a configurada, ou ser a atual se não houver reajuste).

IMPORTANTE SOBRE OS DADOS:
- Os dados podem estar separados por vírgulas (CSV), tabulações ou múltiplos espaços.
- Se os dados NÃO possuírem cabeçalho, assuma obrigatoriamente a ordem das colunas como: SKU, Descrição, Preço Atual, Estoque, Custo.
- Se houver cabeçalho, use-o para identificar as informações corretamente.
- Ignore linhas vazias ou dados incompletos.

DIRETRIZES DE SAÍDA:
Retorne EXCLUSIVAMENTE um array em formato JSON. Não adicione nenhum texto antes ou depois.
Cada objeto do JSON deve conter exatamente estas chaves:
- "sku"
- "descricao_produto"
- "preco_venda_atual"
- "margem_atual_porcentagem"
- "novo_preco_venda"
- "margem_novo_preco_porcentagem"
- "precisa_de_reajuste" (Retorne o valor booleano true se a margem atual estiver abaixo da desejada, caso contrário false)
- "estoque" (O valor do estoque fornecido nos dados)
- "custo_produto" (O valor do custo fornecido nos dados)
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
    model: "gemini-3.1-pro-preview",
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

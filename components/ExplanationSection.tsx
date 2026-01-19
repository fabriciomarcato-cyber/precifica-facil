
import React from 'react';
import { Platform } from '../types';
import { getMarketplaceIcon } from './MarketplaceIcons';
import { ExplanationFeesIcon, ExplanationMarginIcon, ExplanationShippingIcon, ExplanationTaxIcon } from './CustomIcons';

const InfoCard: React.FC<React.PropsWithChildren<{ icon: React.ReactNode; title: string }>> = ({ icon, title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col h-full">
        <div className="flex items-center mb-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full mr-4">{icon}</div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-600 space-y-3 text-sm">{children}</div>
    </div>
);

const FormulaCard: React.FC<React.PropsWithChildren<{ platform: Platform; formula: string }>> = ({ platform, formula, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col h-full">
        <div className="flex items-center mb-4">
            {getMarketplaceIcon(platform)}
            <h4 className="text-lg font-bold text-gray-800 ml-3">{platform}</h4>
        </div>
        <div className="bg-gray-100 p-3 rounded-md text-center mb-4">
            <code className="text-sm text-gray-700 font-mono">{formula}</code>
        </div>
        <div className="text-gray-600 text-sm space-y-2">
            {children}
        </div>
    </div>
);

export default function ExplanationSection() {
    return (
        <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">Entenda os principais conceitos usados nos cálculos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InfoCard icon={<ExplanationMarginIcon />} title="Margem de Contribuição">
                    <p>É o lucro que sobra para você depois de pagar todas as despesas da venda.</p>
                    <p>Na prática, é o dinheiro que fica para o seu negócio crescer, pagar contas e gerar resultado.</p>
                    <div className="bg-slate-100 p-3 rounded-md mt-2">
                        <p className="font-semibold text-slate-800">Exemplo:</p>
                        <p className="text-slate-600">Se você vende um produto por R$ 100 e, depois de todas as taxas, sobram R$ 15, sua margem de contribuição é 15%.</p>
                    </div>
                </InfoCard>

                <InfoCard icon={<ExplanationFeesIcon />} title="Taxas dos Marketplaces">
                    <p>Cada marketplace cobra uma comissão sobre a venda, além de algumas taxas fixas. Essas taxas variam de acordo com a plataforma e o tipo de anúncio.</p>
                    <p>Por isso, o mesmo produto pode ter preços e lucros diferentes no Mercado Livre, Shopee, TikTok Shop ou Instagram.</p>
                </InfoCard>

                <InfoCard icon={<ExplanationShippingIcon />} title="Frete Grátis">
                    <p>Em alguns marketplaces, o frete grátis é obrigatório acima de determinado valor. Nesse caso, o custo do frete sai do seu bolso e precisa ser considerado no cálculo.</p>
                    <p>Se o frete não for incluído no preço corretamente, a venda pode parecer boa, mas gerar prejuízo.</p>
                </InfoCard>

                <InfoCard icon={<ExplanationTaxIcon />} title="Imposto do Simples Nacional">
                    <p>O Simples Nacional é o imposto pago por empresas enquadradas nesse regime. Ele não é um valor fixo: normalmente começa em torno de 4% sobre o valor da venda e vai aumentando conforme o faturamento anual da empresa cresce.</p>
                    <p>Ou seja, quanto mais a empresa fatura ao longo do ano, maior pode ficar essa porcentagem aplicada nas vendas.</p>
                    <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                        <p className="font-semibold text-yellow-900">👉 Quem é MEI não paga esse percentual sobre a venda, pois o imposto já é pago mensalmente em um valor fixo (DAS).</p>
                    </div>
                </InfoCard>
            </div>

            <div className="mt-16">
                 <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">Resumo das Fórmulas de Cálculo</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormulaCard platform={Platform.ML_CLASSICO} formula="(Custo + Taxa) / (1 - % Total)">
                        <p>O cálculo do Mercado Livre é o mais complexo, pois a <strong>taxa fixa e a comissão podem mudar</strong> dependendo do preço final do produto.</p>
                        <p>A calculadora resolve isso automaticamente, testando diferentes cenários para encontrar o preço exato que garante sua margem.</p>
                    </FormulaCard>
                    <FormulaCard platform={Platform.SHOPEE} formula="(Custo + Taxa Fixa) / (1 - % Total)">
                        <p>A Shopee utiliza uma comissão sobre a venda mais uma taxa fixa por item vendido.</p>
                        <p>O <strong>"% Total"</strong> na fórmula é a soma da sua margem, da comissão da Shopee e do imposto (Simples Nacional).</p>
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                           <p className="font-semibold text-orange-800 text-xs">Atenção: Para produtos com preço de venda abaixo de R$ 10,00, a taxa fixa é substituída por uma cobrança de 50% do valor da venda.</p>
                        </div>
                    </FormulaCard>
                    <FormulaCard platform={Platform.TIKTOK_SHOP} formula="(Custo + Taxa Fixa) / (1 - % Total)">
                        <p>O TikTok Shop soma a comissão padrão com uma comissão de frete grátis, além de taxas adicionais.</p>
                        <p>O <strong>"% Total"</strong> inclui sua margem, as duas comissões e o imposto.</p>
                    </FormulaCard>
                    <FormulaCard platform={Platform.INSTAGRAM} formula="(Custo + Taxas Fixas) / (1 - % Total)">
                        <p>O cálculo para venda direta considera as taxas de pagamento que você configurar (maquininha, PIX, etc.), além da sua margem e imposto.</p>
                        <p>O <strong>"% Total"</strong> é a soma da sua margem, do imposto e das taxas percentuais de pagamento.</p>
                    </FormulaCard>
                 </div>
            </div>

            <div className="mt-12 bg-indigo-50 border-2 border-indigo-200 p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-indigo-900 mb-4">📌 Por que tudo isso é importante?</h3>
                <p className="text-indigo-800">Porque vender sem considerar taxas, impostos e frete é um dos principais motivos de prejuízo nos marketplaces. Esta calculadora foi criada para te ajudar a:</p>
                <ul className="list-disc list-inside mt-4 space-y-2 text-indigo-700 font-medium">
                    <li>Saber quanto cobrar</li>
                    <li>Entender quanto realmente sobra</li>
                    <li>Evitar vender achando que está lucrando, quando não está</li>
                </ul>
            </div>

            <div className="mt-8 bg-green-50 border-2 border-green-200 p-6 rounded-xl text-center">
                <p className="text-xl font-bold text-green-900">💡 Dica final</p>
                <p className="text-green-800 mt-2">Sempre que mudar de marketplace, fornecedor ou condição de frete, refaça o cálculo. Preço certo é aquele que vende e dá lucro.</p>
            </div>
        </div>
    );
}
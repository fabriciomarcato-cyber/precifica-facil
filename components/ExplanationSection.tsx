
import React from 'react';
import { Platform } from '../types';
import { getMarketplaceIcon } from './MarketplaceIcons';

const MarginIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

const FeesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
);

const ShippingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
        <path d="M14 9h4l4 4v4h-8v-4h-3" />
        <circle cx="6.5" cy="18.5" r="2.5" />
        <circle cx="16.5" cy="18.5" r="2.5" />
    </svg>
);

const TaxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m21.21 15.89-1.21-1.21a2 2 0 0 0-2.83 0L14 17.83l-2.07-2.07a2 2 0 0 0-2.83 0L2.88 22.07" />
        <path d="M6.83 11.5L14 5l3.17 3.17" />
        <path d="M5 22v-2.07" />
        <path d="M22 2v2.07" />
        <path d="M12.79 3.21 11 5" />
        <path d="M11 5h.01" />
        <path d="M3.93 12.07 5 11" />
        <path d="m19 9 1.17 1.17" />
    </svg>
);

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
                <InfoCard icon={<MarginIcon />} title="Margem de Contribuição">
                    <p>É o lucro que sobra para você depois de pagar todas as despesas da venda.</p>
                    <p>Na prática, é o dinheiro que fica para o seu negócio crescer, pagar contas e gerar resultado.</p>
                    <div className="bg-slate-100 p-3 rounded-md mt-2">
                        <p className="font-semibold text-slate-800">Exemplo:</p>
                        <p className="text-slate-600">Se você vende um produto por R$ 100 e, depois de todas as taxas, sobram R$ 15, sua margem de contribuição é 15%.</p>
                    </div>
                </InfoCard>

                <InfoCard icon={<FeesIcon />} title="Taxas dos Marketplaces">
                    <p>Cada marketplace cobra uma comissão sobre a venda, além de algumas taxas fixas. Essas taxas variam de acordo com a plataforma e o tipo de anúncio.</p>
                    <p>Por isso, o mesmo produto pode ter preços e lucros diferentes no Mercado Livre, Shopee, TikTok Shop ou Instagram.</p>
                </InfoCard>

                <InfoCard icon={<ShippingIcon />} title="Frete Grátis">
                    <p>Em alguns marketplaces, o frete grátis é obrigatório acima de determinado valor. Nesse caso, o custo do frete sai do seu bolso e precisa ser considerado no cálculo.</p>
                    <p>Se o frete não for incluído no preço corretamente, a venda pode parecer boa, mas gerar prejuízo.</p>
                </InfoCard>

                <InfoCard icon={<TaxIcon />} title="Imposto do Simples Nacional">
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
                    <FormulaCard platform={Platform.INSTAGRAM} formula="Custo / (1 - % Total)">
                        <p>O cálculo para venda direta no Instagram (ou qualquer venda sem intermediários) é o mais simples, pois não há comissões ou taxas fixas.</p>
                        <p>O <strong>"% Total"</strong> aqui é apenas a soma da sua margem de contribuição e do imposto.</p>
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
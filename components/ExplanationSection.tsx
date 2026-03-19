
import React from 'react';
import { Platform } from '../types';
import { getMarketplaceIcon } from './MarketplaceIcons';
import { Percent, DollarSign, Truck, Banknote } from 'lucide-react';

const InfoCard: React.FC<React.PropsWithChildren<{ icon: React.ReactNode; title: string }>> = ({ icon, title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col h-full">
        <div className="flex items-center mb-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full mr-4">{icon}</div>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-600 space-y-3 text-sm">{children}</div>
    </div>
);

const getPlatformColor = (platform: Platform) => {
    switch (platform) {
        case Platform.ML_CLASSICO:
        case Platform.ML_PREMIUM:
            return 'bg-yellow-50 border-yellow-200';
        case Platform.SHOPEE:
            return 'bg-red-50 border-red-200';
        case Platform.TIKTOK_SHOP:
            return 'bg-gray-50 border-gray-200';
        case Platform.INSTAGRAM:
            return 'bg-blue-50 border-blue-200';
        default:
            return 'bg-white border-gray-200';
    }
};

const FormulaCard: React.FC<React.PropsWithChildren<{ platform: Platform; formula: string }>> = ({ platform, formula, children }) => {
    const colorClasses = getPlatformColor(platform);
    return (
        <div className={`${colorClasses} p-6 rounded-xl shadow-md border flex flex-col h-full`}>
            <div className="flex items-center mb-4">
                {getMarketplaceIcon(platform)}
                <h4 className="text-lg font-bold text-gray-800 ml-3">{platform}</h4>
            </div>
            <div className="bg-white/50 p-3 rounded-md text-center mb-4 border border-black/5">
                <code className="text-sm text-gray-700 font-mono">{formula}</code>
            </div>
            <div className="text-gray-600 text-sm space-y-2">
                {children}
            </div>
        </div>
    );
};

export default function ExplanationSection() {
    return (
        <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">Entenda os principais conceitos usados nos cálculos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InfoCard icon={<DollarSign className="w-6 h-6" />} title="Margem de Contribuição">
                    <p>É o lucro que sobra para você depois de pagar todas as despesas da venda.</p>
                    <p>Na prática, é o dinheiro que fica para o seu negócio crescer, pagar contas e gerar resultado.</p>
                    <div className="bg-slate-100 p-3 rounded-md mt-2">
                        <p className="font-semibold text-slate-800">Exemplo:</p>
                        <p className="text-slate-600">Se você vende um produto por R$ 100 e, depois de todas as taxas, sobram R$ 15, sua margem de contribuição é 15%.</p>
                    </div>
                </InfoCard>

                <InfoCard icon={<Percent className="w-6 h-6" />} title="Taxas dos Marketplaces">
                    <p>Cada marketplace cobra uma comissão sobre a venda, além de algumas taxas fixas. Essas taxas variam de acordo com a plataforma e o tipo de anúncio.</p>
                    <p>Por isso, o mesmo produto pode ter preços e lucros diferentes no Mercado Livre, Shopee, TikTok Shop ou Instagram.</p>
                </InfoCard>

                <InfoCard icon={<Truck className="w-6 h-6" />} title="Frete Grátis">
                    <p>Em alguns marketplaces, o frete grátis é obrigatório acima de determinado valor. Nesse caso, o custo do frete sai do seu bolso e precisa ser considerado no cálculo.</p>
                    <p>Se o frete não for incluído no preço corretamente, a venda pode parecer boa, mas gerar prejuízo.</p>
                </InfoCard>

                <InfoCard icon={<Banknote className="w-6 h-6" />} title="Imposto do Simples Nacional">
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
                    <FormulaCard platform={Platform.ML_CLASSICO} formula="(Custo + Frete) / (1 - % Total)">
                        <p>O cálculo do Mercado Livre (ref. Mar/2026) usa um <strong>custo de frete variável</strong>, que depende do <strong>preço</strong> e do <strong>peso</strong> do produto, conforme a nova tabela de custos operacionais.</p>
                        <p>Essa nova taxa substitui a antiga "taxa fixa" e é aplicada a todas as faixas de preço.</p>
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                           <p className="font-semibold text-yellow-800 text-xs">Atenção: O custo de frete do ML depende do <strong>preço</strong> e do <strong>peso</strong>. Insira o peso correto para um cálculo preciso.</p>
                           <p className="text-yellow-700 text-xs mt-1">Lembre-se de usar o maior valor entre o peso físico e o cúbico (C x L x A / 6000).</p>
                        </div>
                    </FormulaCard>
                    <FormulaCard platform={Platform.SHOPEE} formula="(Custo + Taxa Fixa) / (1 - % Total)">
                        <p className='mb-2'>O cálculo da Shopee (ref. Mar/2026) possui taxas progressivas e regras especiais que a calculadora aplica para você:</p>
                        <ul className="list-disc list-inside space-y-2 text-xs">
                            <li><strong>Até R$ 79,99:</strong> Comissão de 20% + Taxa de R$ 4,00</li>
                            <li><strong>De R$ 80,00 a R$ 99,99:</strong> Comissão de 14% + Taxa de R$ 16,00</li>
                            <li><strong>De R$ 100,00 a R$ 199,99:</strong> Comissão de 14% + Taxa de R$ 20,00</li>
                            <li><strong>De R$ 200,00 a R$ 499,99:</strong> Comissão de 14% + Taxa de R$ 26,00</li>
                            <li><strong>Acima de R$ 500,00:</strong> Comissão de 14% + Taxa de R$ 26,00</li>
                        </ul>
                        <div className="mt-3 text-xs space-y-1">
                            <p><strong>+ Taxas Adicionais:</strong> Taxa de 2,5% (Campanha) e taxa de R$ 3,00 (CPF alto volume) são somadas quando aplicável.</p>
                            <p><strong>Regra de Baixo Valor (CNPJ):</strong> Para itens abaixo de R$ 8,00, a taxa fixa é 50% do valor do produto.</p>
                            <p><strong>Regra de Baixo Valor (CPF):</strong> Para itens abaixo de R$ 12,00, a taxa é regressiva (ex: R$10 paga R$6,50; R$8 paga R$6).</p>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                           <p className="font-semibold text-blue-800 text-xs">Não se preocupe em decorar as regras! A ferramenta aplica a lógica correta para encontrar o preço ideal para o seu cenário.</p>
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
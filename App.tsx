
import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useAccess } from './hooks/useAccess';
import SettingsPanel from './components/SettingsPanel';
import CalculatorSection from './components/CalculatorSection';
import ExplanationSection from './components/ExplanationSection';
import HelpSidebar from './components/HelpSidebar';
import AdminDashboard from './components/AdminDashboard';
import { Calculator, HelpCircle, Settings, Zap, LogIn, User as UserIcon, KeyRound, ShieldCheck } from 'lucide-react';

const ActivationInput: React.FC<{
  activate: (code: string) => Promise<{ success: boolean; message?: string }>;
}> = ({ activate }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        
        // Padronização: 3 blocos de 4 caracteres alfanuméricos (Ex: K9B2-X7M4-P1Q8)
        const couponPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        const formattedCode = code.trim().toUpperCase();

        if (!couponPattern.test(formattedCode)) {
            setError('Padrão inválido (Ex: K9B2-X7M4-P1Q8)');
            return;
        }

        setLoading(true);
        const result = await activate(formattedCode);
        if (!result.success) {
            setError(result.message || 'Código inválido.');
        } else {
            setCode('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 5000);
        }
        setLoading(false);
    };
    
    return (
        <div className="flex flex-col items-end relative">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value);
                        if (success) setSuccess(false);
                    }}
                    placeholder="K9B2-X7M4-P1Q8"
                    className="rounded-lg border-gray-300 shadow-md text-sm px-3 py-3 bg-white text-gray-900 w-44 focus:ring-blue-500 focus:border-blue-500 h-[48px]"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-300 text-sm h-[48px] flex items-center justify-center"
                >
                    {loading ? '...' : 'Ativar'}
                </button>
            </form>
            {error && <p className="text-[10px] text-red-600 mt-0.5 absolute -bottom-4 right-0">{error}</p>}
            {success && <p className="text-[10px] text-green-600 mt-0.5 absolute -bottom-4 right-0">Acesso liberado com sucesso!</p>}
        </div>
    );
};

export default function App() {
  const { user, accessLevel, expiration, isLoading: isAccessLoading, activate, message: accessMessage, revalidateAccess, login } = useAccess();
  const { settings, setSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const isAdmin = user?.email === 'fabricio.marcato@gmail.com';

  if (isAccessLoading) {
    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
            <p>Carregando...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 py-4 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center">
              <Calculator className="w-10 h-10 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-700 ml-4 whitespace-nowrap">Precifica Fácil</h1>
            </div>
            <p className="text-lg text-gray-500 mt-1 text-center md:text-left">Precificação inteligente para marketplaces</p>
          </div>
          
          {/* Action Buttons Column */}
          <div className="flex flex-col items-center md:items-end gap-2">
            {accessLevel === 'full' && expiration && (
              <div className="text-[11px] font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3" />
                <span>Acesso Completo até {new Date(expiration).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
              {accessLevel === 'restricted' && user && (
                <div className="text-[10px] text-gray-500 max-w-[200px] text-right leading-tight mr-2">
                  Acesso automático para compradores. Se você já comprou, verifique se está usando o e-mail correto.
                </div>
              )}
              {accessLevel === 'restricted' && <ActivationInput activate={activate} />}
              {user ? (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 truncate max-w-[150px]">{user.email}</span>
                </div>
              ) : (
                <button
                  onClick={login}
                  className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex flex-col items-center gap-1 font-semibold text-center"
                  title="Login com Google"
                >
                  <div className="flex items-center gap-2">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    <span>Login com Google</span>
                  </div>
                  <span className="text-[10px] font-normal text-gray-500 leading-tight">Para usar em outros navegadores</span>
                </button>
              )}
              {accessLevel === 'restricted' && (
                 <a
                  href="https://pay.kiwify.com.br/HX8c6Q4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2 font-semibold animate-premium-pulse h-[48px]"
                  aria-label="Clique Aqui! Assinatura Anual"
                >
                  <Zap className="w-5 h-5"/>
                  <span>Assinatura Anual</span>
                </a>
              )}
              {!showSettings && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center animate-infrequent-pulse"
                  title="Configurações"
                  aria-label="Abrir configurações"
                >
                  <Settings className="w-6 h-6"/>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                  title="Painel Administrativo"
                  aria-label="Abrir painel administrativo"
                >
                  <ShieldCheck className="w-6 h-6"/>
                </button>
              )}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center"
                title="Ajuda"
                aria-label="Abrir ajuda"
              >
                <HelpCircle className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <main>
          <SettingsPanel 
            initialSettings={settings}
            onSave={setSettings}
            isOpen={showSettings}
            setIsOpen={setShowSettings}
            accessLevel={accessLevel}
          />
          <CalculatorSection 
            settings={settings}
            accessLevel={accessLevel}
            activate={activate}
            expiration={expiration}
            accessMessage={accessMessage}
            revalidateAccess={revalidateAccess}
          />
          <ExplanationSection accessLevel={accessLevel} />
        </main>
        
        <AdminDashboard 
          isOpen={showAdmin}
          onClose={() => setShowAdmin(false)}
        />

        <footer className="text-center text-sm text-gray-500 mt-12 py-4 border-t border-gray-200">
          <p>&copy; {new Date().getFullYear()} Precifica Fácil. Todos os direitos reservados.</p>
        </footer>
      </div>

      {/* Help Sidebar */}
      <HelpSidebar isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
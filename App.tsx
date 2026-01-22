
import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useAccess } from './hooks/useAccess';
import SettingsPanel from './components/SettingsPanel';
import CalculatorSection from './components/CalculatorSection';
import ExplanationSection from './components/ExplanationSection';
import HelpSidebar from './components/HelpSidebar';
import { Calculator, HelpCircle, Settings, Zap } from 'lucide-react';

export default function App() {
  const { accessLevel, expiration, isLoading: isAccessLoading, activate, message: accessMessage, revalidateAccess } = useAccess();
  const { settings, setSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
        <header className="text-center mb-8 py-4 md:flex md:items-center md:justify-between">
          <div>
            <div className="flex items-center justify-center md:justify-start">
              <Calculator className="w-10 h-10 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-700 ml-4">Precifica Fácil</h1>
            </div>
            <p className="text-lg text-gray-500 mt-2 text-center md:text-left">Precificação inteligente para marketplaces</p>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-4 md:mt-0 flex items-center justify-center md:justify-end gap-4">
            {accessLevel === 'restricted' && (
               <a
                href="https://pay.kiwify.com.br/HX8c6Q4"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2 font-semibold animate-premium-pulse"
                aria-label="Ativar acesso completo"
              >
                <Zap className="w-5 h-5"/>
                <span>Ativar Acesso</span>
              </a>
            )}
            {!showSettings && (
              <button
                onClick={() => setShowSettings(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-2 font-semibold animate-infrequent-pulse"
                aria-label="Abrir configurações"
              >
                <Settings className="w-5 h-5"/>
                <span>Configuração</span>
              </button>
            )}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2 font-semibold"
              aria-label="Abrir ajuda"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Precisa de Ajuda?</span>
            </button>
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
          <ExplanationSection />
        </main>
        
        <footer className="text-center text-sm text-gray-500 mt-12 py-4 border-t border-gray-200">
          <p>&copy; {new Date().getFullYear()} Precifica Fácil. Todos os direitos reservados.</p>
        </footer>
      </div>

      {/* Help Sidebar */}
      <HelpSidebar isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
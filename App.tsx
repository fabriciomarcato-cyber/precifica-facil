
import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useAuth } from './hooks/useAuth';
import { useAccess } from './hooks/useAccess';
import LoginPage from './components/LoginPage';
import SettingsPanel from './components/SettingsPanel';
import CalculatorSection from './components/CalculatorSection';
import ExplanationSection from './components/ExplanationSection';
import { MainCalculatorIcon, LogoutIcon } from './components/CustomIcons';

export default function App() {
  const { isAuthenticated, isAuthLoading, login, logout } = useAuth();
  const { accessLevel, expiration, isLoading: isAccessLoading, activate, message: accessMessage } = useAccess();
  const { settings, setSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

  if (isAuthLoading || isAccessLoading) {
    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
            <p>Carregando...</p>
        </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="flex items-center justify-center">
            <MainCalculatorIcon className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-700 ml-4">Precifica Fácil</h1>
          </div>
          <p className="text-lg text-gray-500 mt-2">Precificação inteligente para marketplaces</p>
           <button 
                onClick={logout} 
                className="absolute top-0 right-0 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                aria-label="Sair da aplicação"
            >
                <LogoutIcon className="w-5 h-5" />
                Sair
            </button>
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
          />
          <ExplanationSection />
        </main>
        
        <footer className="text-center text-sm text-gray-500 mt-12 py-4 border-t border-gray-200">
          <p>&copy; {new Date().getFullYear()} Precifica Fácil. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
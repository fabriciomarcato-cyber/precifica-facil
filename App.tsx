
import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import { useAccess } from './hooks/useAccess';
import SettingsPanel from './components/SettingsPanel';
import CalculatorSection from './components/CalculatorSection';
import ExplanationSection from './components/ExplanationSection';
import { Calculator } from 'lucide-react';

export default function App() {
  const { accessLevel, expiration, isLoading: isAccessLoading, activate, message: accessMessage, revalidateAccess } = useAccess();
  const { settings, setSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);

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
        <header className="text-center mb-8 relative">
          <div className="flex items-center justify-center">
            <Calculator className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-700 ml-4">Precifica Fácil</h1>
          </div>
          <p className="text-lg text-gray-500 mt-2">Precificação inteligente para marketplaces</p>
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
    </div>
  );
}
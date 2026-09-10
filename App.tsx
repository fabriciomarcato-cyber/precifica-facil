
import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import SettingsPanel from './components/SettingsPanel';
import CalculatorSection from './components/CalculatorSection';
import ExplanationSection from './components/ExplanationSection';
import HelpSidebar from './components/HelpSidebar';
import { Calculator, HelpCircle, Settings } from 'lucide-react';

export default function App() {
  const { settings, setSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
          
          {/* Action Buttons */}
          <div className="flex items-center justify-center md:justify-end gap-3">
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
            <button
              onClick={() => setIsHelpOpen(true)}
              className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center"
              title="Ajuda"
              aria-label="Abrir ajuda"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main>
          <SettingsPanel 
            initialSettings={settings}
            onSave={setSettings}
            isOpen={showSettings}
            setIsOpen={setShowSettings}
          />
          <CalculatorSection 
            settings={settings}
            setSettings={setSettings}
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
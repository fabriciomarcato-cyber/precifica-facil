
import React, { useState } from 'react';
import { useSettings } from './hooks/useSettings';
import SettingsPanel from './components/SettingsPanel';
import CalculatorSection from './components/CalculatorSection';

const CalculatorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <line x1="16" x2="12" y1="14" y2="14" />
    <line x1="12" x2="12" y1="14" y2="18" />
    <line x1="8" x2="8" y1="14" y2="18" />
  </svg>
);


export default function App() {
  const { settings, setSettings } = useSettings();
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-center mb-8">
          <CalculatorIcon className="w-10 h-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-700 ml-4">Precifica Fácil</h1>
        </header>

        <main>
          <SettingsPanel 
            initialSettings={settings}
            onSave={setSettings}
            isOpen={showSettings}
            setIsOpen={setShowSettings}
          />
          <CalculatorSection settings={settings} />
        </main>
      </div>
    </div>
  );
}


import React from 'react';
import { X, Youtube, Mail, HelpCircle } from 'lucide-react';

interface HelpSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpSidebar({ isOpen, onClose }: HelpSidebarProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-50 transform transition-transform ease-in-out duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the sidebar
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            Central de Ajuda
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200"
            aria-label="Fechar"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">Como a calculadora funciona?</h3>
            <p className="text-sm text-gray-600">
              Basta inserir o custo do seu produto para ver o preço de venda ideal em cada plataforma, já com todas as taxas e impostos incluídos para garantir seu lucro.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">O que acontece quando o acesso expira?</h3>
            <p className="text-sm text-gray-600">
              Quando o tempo do seu código de acesso acaba, a calculadora volta ao modo gratuito, com acesso limitado a algumas plataformas. Para liberar tudo novamente, basta inserir um novo código.
            </p>
          </div>

          <a
            href="https://youtu.be/Z0cPCFZ4yus"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 w-full text-left"
          >
            <Youtube className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
                <span className="font-bold text-red-800">Tutorial em Vídeo</span>
                <p className="text-xs text-red-700">Assista nosso guia rápido no YouTube para aprender a usar todas as funções.</p>
            </div>
          </a>

          <a
            href="mailto:calculadoraprecificafacil@gmail.com"
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 w-full text-left"
          >
            <Mail className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <span className="font-bold text-blue-800">Suporte por E-mail</span>
              <p className="text-xs text-blue-700">Precisa de ajuda? Envie um e-mail para nós: calculadoraprecificafacil@gmail.com</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
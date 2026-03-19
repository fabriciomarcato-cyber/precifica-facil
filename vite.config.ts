import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// --- A BLINDAGEM COMEÇA AQUI ---
// Essas duas linhas permitem usar __dirname sem quebrar o projeto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -------------------------------

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.VITE_Calc_Prec_Fac': JSON.stringify(process.env.VITE_Calc_Prec_Fac || ''),
        'process.env.API_KEY': JSON.stringify(process.env.VITE_Calc_Prec_Fac || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Encaminha /api para o Django em desenvolvimento.
    // Sem changeOrigin: o Host segue como localhost:5173, o que mantém a validação CSRF do Django.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
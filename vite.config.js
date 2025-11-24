import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const devPort = Number(process.env.PORT) || 3000
const functionsPort = Number(process.env.FUNCTIONS_PORT) || 3001

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    proxy: {
      '/api': {
        target: `http://localhost:${functionsPort}`,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions')
      }
    }
  }
})

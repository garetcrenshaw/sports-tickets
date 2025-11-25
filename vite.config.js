import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devPort = 3000
const functionsPort = 3001

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `http://localhost:${functionsPort}`,
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})

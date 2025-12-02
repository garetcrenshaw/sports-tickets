import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devPort = 3000
const functionsPort = 3001

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist'
  },
  server: {
    port: devPort,
    host: '127.0.0.1', // Use localhost instead of 0.0.0.0
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${functionsPort}`,
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  // Disable automatic .env loading to avoid sandbox issues
  envDir: false
})

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
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // Disable automatic .env loading to avoid sandbox issues
  envPrefix: []
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const devPort = Number(process.env.PORT) || 3000

export default defineConfig({
  plugins: [react()],
  server: {
    port: devPort,
    proxy: {
      '/api': {
        target: `http://localhost:${devPort}`,
        changeOrigin: true,
        secure: false
      }
    }
  }
})

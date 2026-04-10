import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '/api/v1'),
      },
      '/tti': {
        target: 'http://192.168.1.19:7082',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tti/, ''),
      },
      '/ttv': {
        target: 'http://192.168.1.19:7083',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ttv/, ''),
      },
    },
  },
})

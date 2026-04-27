import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendors so the browser fetches in parallel and caches
        // aggressively. Demo is lazy-loaded separately via React.lazy.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('@radix-ui')) return 'radix'
          if (
            id.includes('i18next') ||
            id.includes('react-i18next')
          ) {
            return 'i18n'
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})

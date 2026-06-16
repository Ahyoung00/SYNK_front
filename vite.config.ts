import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },

  base: '/',

  build: {
    // Capacitor reads from /dist by default (see capacitor.config.ts)
    outDir: 'dist',
    // Avoid inline assets that break Capacitor's CSP
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Code-split by feature area for better caching
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
          capacitor: [
            '@capacitor/core',
            '@capacitor/camera',
            '@capacitor/push-notifications',
            '@capacitor/app',
          ],
        },
      },
    },
  },

  server: {
    // Proxy Spring Boot REST / WebSocket during local dev
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      registerType: 'prompt',
      injectRegister: false,
      integration: {
        configureCustomSWViteBuild(config) {
          config.build.codeSplitting = false
          delete config.build.rollupOptions?.output?.inlineDynamicImports
        },
      },
      includeAssets: ['patawallet-mark.svg', 'icons/patawallet-192.png', 'icons/patawallet-512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'PataWallet · Finanzas personales',
        short_name: 'PataWallet',
        description: 'Finanzas personales privadas, claras y acompañadas por tu manada.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b1425',
        theme_color: '#0b1425',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icons/patawallet-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/patawallet-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/patawallet-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
        globIgnores: ['**/assets/illustrations/*-800.webp', '**/assets/illustrations/*-1122.webp'],
        maximumFileSizeToCacheInBytes: 700000,
      },
    }),
  ],
  // Las capturas y trazas no son código: evitan recargas durante verificación visual.
  server: { host: '127.0.0.1', port: 4173, watch: { ignored: ['**/output/**', '**/.playwright-cli/**'] } },
  preview: { host: '127.0.0.1', port: 4173 },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router)/, priority: 20 },
            { name: 'motion-vendor', test: /node_modules[\\/](motion|framer-motion)/, priority: 15 },
            { name: 'data-vendor', test: /node_modules[\\/](dexie|zod)/, priority: 10 },
            { name: 'vendor', test: /node_modules/, maxSize: 250000, priority: 1 },
          ],
        },
      },
    },
  },
})

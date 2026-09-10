import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4173 },
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

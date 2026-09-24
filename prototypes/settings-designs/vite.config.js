import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Mantiene la exploración fuera de la aplicación real y reutiliza sus dependencias y recursos públicos.
const prototypeRoot = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = path.resolve(prototypeRoot, '../..')

export default defineConfig({
  root: prototypeRoot,
  plugins: [react()],
  publicDir: path.join(repositoryRoot, 'public'),
  server: {
    host: '127.0.0.1',
    port: 4176,
    strictPort: true,
    fs: { allow: [repositoryRoot] },
  },
})

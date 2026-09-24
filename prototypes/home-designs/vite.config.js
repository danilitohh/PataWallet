import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Sirve el prototipo de forma aislada y reutiliza únicamente las dependencias y assets estáticos del repo.
const prototypeRoot = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = path.resolve(prototypeRoot, '../..')

export default defineConfig({
  root: prototypeRoot,
  plugins: [react()],
  publicDir: path.join(repositoryRoot, 'public'),
  server: {
    host: '127.0.0.1',
    port: 4175,
    strictPort: true,
    fs: { allow: [repositoryRoot] },
  },
})

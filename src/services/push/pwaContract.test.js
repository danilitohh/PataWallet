import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const worker = readFileSync(new URL('../../service-worker.js', import.meta.url), 'utf8')
const viteConfig = readFileSync(new URL('../../../vite.config.js', import.meta.url), 'utf8')
const vercelConfig = readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8')

describe('contrato PWA', () => {
  it('usa un worker inyectado, iconos y actualización solicitada por el usuario', () => {
    expect(viteConfig).toContain("strategies: 'injectManifest'")
    expect(viteConfig).toContain("registerType: 'prompt'")
    expect(viteConfig).toContain('patawallet-192.png')
    expect(viteConfig).toContain('patawallet-512.png')
    expect(worker).toContain("event.data?.type === 'SKIP_WAITING'")
    expect(worker).not.toContain('clientsClaim()')
  })

  it('siempre presenta un aviso y restringe navegación y caché de API', () => {
    expect(worker).toContain('showNotification')
    expect(worker).toContain('SAFE_ROUTES')
    expect(worker).toContain("denylist: [/^\\/api\\//")
    expect(vercelConfig).toContain('(?!api/)')
  })
})

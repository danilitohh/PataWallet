import { expect, test } from '@playwright/test'

test('el paso de integraciones enseña a instalar PataWallet en cada dispositivo', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route('**/__signup-install-guide-test', (route) => route.fulfill({ contentType: 'text/html', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      await import('/tests/e2e/fixtures/signup-install-guide-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__signup-install-guide-test')

  await page.getByLabel('Tu nombre').fill('Danilo')
  for (const step of ['Portada', 'Moneda', 'Presupuesto']) {
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('region', { name: `Paso ${['Portada', 'Moneda', 'Presupuesto'].indexOf(step) + 2}: ${step}` })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()

  const guide = page.getByRole('region', { name: 'Agrega PataWallet como app' })
  await expect(guide).toBeVisible()
  const suggestedDevice = /iPhone|iPad|iPod/i.test(testInfo.project.use.userAgent || '') ? 'iPhone' : 'Computadora'
  await expect(guide.getByRole('button', { name: suggestedDevice })).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `output/playwright/signup-install-guide-${testInfo.project.name}.png`, fullPage: true })

  await guide.getByRole('button', { name: 'Android' }).click()
  await expect(guide.getByRole('heading', { name: 'Desde Chrome' })).toBeVisible()
  await expect(guide.getByText(/Instalar aplicación/)).toBeVisible()
  await guide.getByRole('button', { name: 'iPhone', exact: true }).click()
  await expect(guide.getByText(/Safari en iPhone y iPad/)).toBeVisible()
  await expect(guide.getByText(/Añadir a pantalla de inicio/)).toBeVisible()
  await guide.getByRole('button', { name: 'Computadora' }).click()
  await expect(guide.getByText(/Instalar página como app/)).toBeVisible()

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.assign(event, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    window.dispatchEvent(event)
  })
  await guide.getByRole('button', { name: 'Instalar ahora' }).click()
  await expect(guide.getByRole('status')).toContainText('Aceptaste la instalación')
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(guide.getByText('Instalada')).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Atrás' })).toBeVisible()
  await expect(pageErrors).toEqual([])
})

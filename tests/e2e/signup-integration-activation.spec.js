import { expect, test } from '@playwright/test'

test('primer acceso ofrece conexión de correo y activación de avisos en el mismo flujo', async ({ page }, testInfo) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  // Simula una PWA instalada con APIs Web Push; no solicita el permiso del sistema.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    window.PushManager = function PushManager() {}
    window.Notification = class Notification { static permission = 'default' }
  })
  await page.route('**/__integration-setup-test', (route) => route.fulfill({ contentType: 'text/html', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body><main id="root"></main><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      await import('/tests/e2e/fixtures/integration-setup-harness.jsx');
    </script></body></html>
  ` }))
  await page.route('**/src/services/mail/mailClient.js*', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function mailRequest(operation = 'status') {
      if (operation !== 'status') return { url: '/oauth-test' };
      return { providers: [
        { provider: 'gmail', available: true, status: 'disconnected' },
        { provider: 'outlook', available: true, status: 'disconnected' },
      ] };
    }
  ` }))
  await page.route('**/api/push/config', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ publicKey: 'BElocalVisualTestKey' }) }))
  await page.goto('/__integration-setup-test')

  await expect(page.getByRole('heading', { name: 'Conecta lo que elegiste' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Conecta tu correo' })).toBeVisible()
  await expect(page.getByText('Bancos para una nueva conexión')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Avisos privados de PataWallet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Activar notificaciones' })).toBeVisible()

  await page.getByRole('checkbox', { name: /Autorizo la lectura/ }).check()
  await page.getByRole('checkbox', { name: 'Lulo' }).check()
  await expect(page.getByRole('button', { name: 'Conectar Gmail' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Conectar Outlook / Hotmail' })).toBeEnabled()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/signup-integration-activation-${testInfo.project.name}.png`, fullPage: true })
  expect(pageErrors).toEqual([])
})

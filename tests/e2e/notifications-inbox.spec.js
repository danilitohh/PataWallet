import { expect, test } from '@playwright/test'

// The header bell must open the focused inbox, not bank-email connection settings.
test('la campana abre solo la bandeja de notificaciones', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  if (testInfo.project.name.startsWith('mobile-')) {
    const bell = page.getByRole('link', { name: /abrir avisos/i })
    await expect(bell).toBeVisible()
    await bell.click({ force: true })
  } else {
    await page.goto('/notificaciones')
  }

  await expect(page).toHaveURL(/\/notificaciones$/)
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu bandeja está lista' })).toBeVisible()
  await expect(page.getByText(/Cuando PataWallet detecte un movimiento/)).toBeVisible()
  await expect(page.getByText('Conecta tu correo', { exact: true })).toHaveCount(0)
})

// A pending alert opens the existing explicit financial-review form without changing balances.
test('un aviso se expande para mostrar sus datos y las opciones de revisión', async ({ page }) => {
  await page.route('**/src/services/bank-email/bankEmailClient.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function bankEmailRequest() { return structuredClone(window.inboxData); }
    export async function bankEmailSummary() { return { pending: 1 }; }
    export async function resolveBankEmail(...args) { window.savedDecision = args; }
  ` }))
  await page.route('**/__notifications-test**', (route) => route.fulfill({ contentType: 'text/html', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/night.css"></head>
    <body><main id="root"></main><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      window.inboxData = { has_more: false, events: [{ id: '550e8400-e29b-41d4-a716-446655440000', bank: 'Lulo', candidate: { counterparty: 'Comercio de prueba', amount_minor: 70675000, occurred_at: '2026-04-30T01:33:00.000Z', direction: 'outgoing' } }] };
      await import('/tests/e2e/fixtures/notifications-inbox-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__notifications-test?review=550e8400-e29b-41d4-a716-446655440000')

  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await expect(page.getByText('1 movimiento necesita tu confirmación')).toBeVisible()
  await expect(page.getByLabel('Qué hacer con este correo')).toBeVisible()
  await page.getByLabel('Qué hacer con este correo').selectOption('record')
  await expect(page.getByLabel('Monto confirmado en COP')).toHaveValue('706.750')
  await expect(page.getByRole('button', { name: 'Confirmar decisión' })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

import { expect, test } from '@playwright/test'

// Monta componentes reales con transporte simulado; no conecta Gmail ni accede a dinero real.
async function mountInbox(page, providers = ['gmail', 'outlook'].map((provider) => ({ provider, available: false, status: 'disconnected' }))) {
  await page.route('**/src/services/mail/mailClient.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function mailRequest(operation='status', body) {
      if (window.mailFailure) throw new Error('No se pudo buscar. Reintenta.');
      if (operation === 'connect') { sessionStorage.setItem('test-mail-consent',JSON.stringify(body)); return {url:'/__oauth-placeholder'}; }
      if (operation === 'sync') return {added:0,has_more:false};
      if (operation === 'disconnect') window.mailData.providers=window.mailData.providers.map(item=>item.provider===body.provider?{...item,status:'disconnected',mailbox:null}:item);
      return structuredClone(window.mailData);
    }
  ` }))
  await page.route('**/src/services/bank-email/bankEmailClient.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function bankEmailRequest(method) {
      if (window.testFailure) throw new Error('Sin conexión. Reintenta.');
      if (method === 'POST') window.inboxData.inbox = { address: 'pw-ejemplo-largo-para-validar-diseno@example.invalid', enabled: true };
      if (method === 'DELETE') window.inboxData.inbox.enabled = false;
      return structuredClone(window.inboxData);
    }
    export async function resolveBankEmail(...args) { window.savedDecision = args; window.inboxData.events = []; }
  ` }))
  await page.route('**/__bank-email-test', (route) => route.fulfill({ contentType: 'text/html', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/night.css"></head>
    <body><main style="max-width:900px;margin:24px auto;padding:16px"><p>Datos sintéticos · receptor simulado</p><div id="root"></div></main><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      window.inboxData = { configured: true, inbox: null, has_more: false, events: [{ id: 'event-example', bank: 'nequi', candidate: { counterparty: 'LULO BANK S A', amount_minor: 70675000, occurred_at: '2026-04-30T01:33:00.000Z', direction: 'outgoing' } }] };
      window.mailData = {providers:${JSON.stringify(providers)}};
      await import('/tests/e2e/fixtures/bank-email-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__bank-email-test')
}

test('reenvío selectivo: consentimiento, privacidad y confirmación de transferencia', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mountInbox(page)
  await expect(page.getByRole('button', { name: 'Crear dirección privada' })).toBeDisabled()
  await page.getByRole('checkbox', { name: /Autorizo el procesamiento/ }).check()
  await page.getByRole('button', { name: 'Crear dirección privada' }).click()
  await expect(page.getByLabel('Copia esta dirección privada')).toHaveValue(/example.invalid$/)
  await page.getByText(/LULO BANK S A ·/).click()
  await page.getByLabel('Qué hacer con este correo').selectOption('record')
  await expect(page.getByLabel('Tipo de movimiento')).toHaveValue('')
  await page.getByLabel('Tipo de movimiento').selectOption('transfer')
  await expect(page.getByText('Sale de una cuenta tuya y entra en otra.')).toBeVisible()
  await page.getByLabel('Cuenta de origen').selectOption('nequi')
  await page.getByLabel('Cuenta de destino').selectOption('lulo')
  await expect(page.getByRole('button', { name: 'Confirmar decisión' })).toBeDisabled()
  await page.evaluate(() => window.renderInbox(true))
  await expect(page.getByLabel('Monto confirmado en COP')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('706.750')
  await page.evaluate(() => window.renderInbox(false))
  await page.getByRole('checkbox', { name: 'Revisé el movimiento y confirmo esta decisión.' }).check()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/bank-email-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Confirmar decisión' }).click()
  await expect(page.getByText('No hay correos pendientes en esta página.')).toBeVisible()
  expect(await page.evaluate(() => window.savedDecision[2])).toMatchObject({ type: 'transfer', amount_minor: 70675000, from_account_id: 'nequi', to_account_id: 'lulo', occurred_at: '2026-04-30T01:33:00.000Z', category_id: null })
  await page.evaluate(() => { window.testFailure = true })
  await page.getByRole('button', { name: 'Actualizar recepción' }).click()
  await expect(page.getByRole('alert')).toHaveText('Sin conexión. Reintenta.')
  expect(errors).toEqual([])
})

test('conectar exige banco y consentimiento; un proveedor sin configurar no se anuncia disponible', async ({ page }) => {
  await mountInbox(page, [{ provider: 'gmail', available: true, status: 'disconnected' }, { provider: 'outlook', available: false, status: 'disconnected' }])
  const connect = page.getByRole('button', { name: 'Conectar Gmail', exact: true })
  await expect(connect).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Nequi', exact: true }).check()
  await expect(connect).toBeDisabled()
  await page.getByRole('checkbox', { name: /Autorizo la lectura/ }).check()
  await expect(connect).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Conectar Outlook / Hotmail', exact: true })).toBeDisabled()
  await page.route('**/__oauth-placeholder', (route) => route.fulfill({ contentType: 'text/html', body: '<p>Autorización simulada. No se contactó Google.</p>' }))
  await connect.click()
  await expect(page).toHaveURL(/__oauth-placeholder$/)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('test-mail-consent')))).toEqual({ provider: 'gmail', banks: ['nequi'], consent: true })
})

test('buzón vinculado permite buscar, recuperarse de un fallo y desconectarse sin borrar movimientos', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', (issue) => errors.push(issue.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mountInbox(page, [{ provider: 'gmail', available: true, status: 'connected', mailbox: 'ejemplo@example.invalid', banks: ['nequi'], last_sync_at: null }])
  await expect(page.getByText('Correo vinculado', { exact: true })).toBeVisible()
  const search = page.getByRole('button', { name: 'Buscar correos en Gmail' })
  await search.click()
  await expect(page.getByRole('status')).toContainText('No se modificaron saldos')
  await page.evaluate(() => { window.mailFailure = true })
  await search.click()
  await expect(page.getByRole('alert')).toHaveText('No se pudo buscar. Reintenta.')
  await page.evaluate(() => { window.mailFailure = false })
  await search.click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.mail-connections').screenshot({ path: `output/playwright/mail-connections-${testInfo.project.name}.png` })
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Desconectar Gmail', exact: true }).click()
  await expect(page.getByText('Sin conectar', { exact: true })).toBeVisible()
  await expect(page.getByText(/LULO BANK S A ·/)).toBeVisible()
  expect(errors).toEqual([])
})

test('ruta real en demo informa la falta de conexión y mantiene navegación', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await expect(page.getByRole('heading', { name: /Hola, Danilo/ })).toBeVisible()
  await page.goto('/ajustes')
  await page.getByRole('link', { name: /Correos bancarios/ }).click()
  await expect(page).toHaveURL(/\/ajustes\/correos-bancarios$/)
  await expect(page.getByText('Demostración · sin conexión')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear dirección privada' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

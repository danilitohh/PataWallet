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

test('un correo entrante abre Nuevo movimiento precargado y asocia el aviso después de guardar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/src/services/bank-email/bankEmailClient.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function bankEmailRequest() { return structuredClone(window.inboxData); }
    export async function bankEmailSummary() { return { pending: window.inboxData.events.length }; }
    export async function resolveBankEmail(...args) { window.savedDecision = args; window.inboxData.events = []; }
  ` }))
  await page.route('**/__notifications-test**', (route) => route.fulfill({ contentType: 'text/html', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/night.css"></head>
    <body><main id="root"></main><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      window.inboxData = { has_more: false, events: [{ id: '550e8400-e29b-41d4-a716-446655440000', bank: 'Lulo', candidate: { counterparty: 'Persona ejemplo', amount_minor: 100000000, occurred_at: '2026-09-30T15:18:00.000Z', direction: 'incoming' } }] };
      await import('/tests/e2e/fixtures/notifications-inbox-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__notifications-test')
  await expect(page.getByText('1 movimiento necesita tu confirmación')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir registro de movimiento de Persona ejemplo' }).click()

  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Recibí dinero' })).toHaveAttribute('aria-pressed', 'true')
  await expect(sheet.getByLabel('Monto')).toHaveValue('1.000.000')
  await expect(sheet.getByLabel('Comercio o nota')).toHaveValue('Persona ejemplo')
  await expect(sheet.getByLabel('Fecha')).toHaveValue('2026-09-30')
  await expect(sheet.getByLabel('Hora')).toHaveValue('10:18')
  await expect(sheet.getByLabel('Categoría', { exact: true })).toHaveValue('')
  await sheet.getByLabel('Categoría', { exact: true }).selectOption('income-category')
  await sheet.getByLabel('¿Dónde lo recibiste?').selectOption('lulo')
  await sheet.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(sheet).toBeHidden()

  await expect.poll(() => page.evaluate(() => window.savedTransaction)).toMatchObject({
    id: 'bank-email-550e8400-e29b-41d4-a716-446655440000',
    type: 'income', amount_minor: 100000000, from_account_id: null, to_account_id: 'lulo',
    category_id: 'income-category', merchant_name: 'Persona ejemplo', note: 'Persona ejemplo',
    occurred_at: '2026-09-30T10:18:00-05:00',
  })
  await expect.poll(() => page.evaluate(() => window.savedDecision?.slice(0, 2))).toEqual([
    '550e8400-e29b-41d4-a716-446655440000', 'link',
  ])
  await expect.poll(() => page.evaluate(() => window.savedDecision?.[3])).toBe('bank-email-550e8400-e29b-41d4-a716-446655440000')
  await expect(page.getByText('Todo al día')).toBeVisible()
})

test('un correo de compra abre el editor normal y deja la categoría para selección manual', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/src/services/bank-email/bankEmailClient.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `
    export async function bankEmailRequest() { return structuredClone(window.inboxData); }
    export async function bankEmailSummary() { return { pending: window.inboxData.events.length }; }
    export async function resolveBankEmail(...args) { window.savedDecision = args; window.inboxData.events = []; }
  ` }))
  await page.route('**/__notifications-test**', (route) => route.fulfill({ contentType: 'text/html', body: `
    <html lang="es" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles/app.css"><link rel="stylesheet" href="/src/styles/night.css"></head>
    <body><main id="root"></main><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      window.inboxData = { has_more: false, events: [{ id: '550e8400-e29b-41d4-a716-446655440001', bank: 'Lulo', candidate: { counterparty: 'PRIMOR COLOMBIA ÉXITO', amount_minor: 11130000, occurred_at: '2026-10-03T23:24:00.000Z', direction: 'outgoing' } }] };
      await import('/tests/e2e/fixtures/notifications-inbox-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__notifications-test')
  await page.getByRole('button', { name: 'Abrir registro de movimiento de PRIMOR COLOMBIA ÉXITO' }).click()

  const sheet = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('button', { name: 'Hice una compra' })).toHaveAttribute('aria-pressed', 'true')
  await expect(sheet.getByLabel('Monto')).toHaveValue('111.300')
  await expect(sheet.getByLabel('Comercio o nota')).toHaveValue('PRIMOR COLOMBIA ÉXITO')
  await expect(sheet.getByLabel('Fecha')).toHaveValue('2026-10-03')
  await expect(sheet.getByLabel('Hora')).toHaveValue('18:24')
  await expect(sheet.getByLabel('Categoría', { exact: true })).toHaveValue('')

  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await sheet.getByLabel('Categoría', { exact: true }).selectOption('market-category')
  await sheet.getByLabel('¿Con qué pagaste?').selectOption('lulo')
  await sheet.getByRole('button', { name: 'Guardar movimiento' }).click()

  await expect.poll(() => page.evaluate(() => window.savedTransaction)).toMatchObject({
    id: 'bank-email-550e8400-e29b-41d4-a716-446655440001',
    type: 'expense', amount_minor: 11130000, from_account_id: 'lulo', category_id: 'market-category',
    merchant_name: 'PRIMOR COLOMBIA ÉXITO', occurred_at: '2026-10-03T18:24:00-05:00',
  })
  await expect.poll(() => page.evaluate(() => window.savedDecision?.[1])).toBe('link')
})

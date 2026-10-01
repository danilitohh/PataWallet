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

// Un ingreso recibido y el pago posterior de una deuda son movimientos distintos.
test('un aviso entrante sugiere ingreso y permite crear su categoría durante la revisión', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
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
      window.inboxData = { has_more: false, events: [{ id: '550e8400-e29b-41d4-a716-446655440000', bank: 'Lulo', candidate: { counterparty: 'Persona ejemplo', amount_minor: 100000000, occurred_at: '2026-09-30T15:18:00.000Z', direction: 'incoming' } }] };
      await import('/tests/e2e/fixtures/notifications-inbox-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__notifications-test?review=550e8400-e29b-41d4-a716-446655440000')

  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await expect(page.getByText('1 movimiento necesita tu confirmación')).toBeVisible()
  await expect(page.getByLabel('Qué hacer con este correo')).toBeVisible()
  await page.getByLabel('Qué hacer con este correo').selectOption('record')
  const type = page.getByLabel('Tipo de movimiento')
  await expect(type).toHaveValue('income')
  await expect(type.locator('option[value="card_payment"]')).toHaveCount(0)
  await expect(page.getByText(/Si luego lo usas para abonar una deuda/)).toBeVisible()
  await expect(page.getByLabel('Monto confirmado en COP')).toHaveValue('1.000.000')
  await page.getByRole('button', { name: 'Crear categoría' }).click()
  const categoryDialog = page.getByRole('dialog', { name: 'Nueva categoría' })
  await categoryDialog.getByLabel('Nombre').fill('Aporte de pareja')
  await categoryDialog.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(categoryDialog).toBeHidden()
  await expect(page.getByLabel('Categoría').locator('option:checked')).toHaveText('Aporte de pareja')
  await page.getByLabel('Cuenta de destino').selectOption('lulo')
  await expect(page.getByRole('button', { name: 'Confirmar decisión' })).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Revisé el movimiento y confirmo esta decisión.' }).check()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Confirmar decisión' }).click()
  await expect.poll(() => page.evaluate(() => window.savedDecision?.[2])).toMatchObject({
    type: 'income', amount_minor: 100000000, from_account_id: null, to_account_id: 'lulo', category_id: expect.any(String),
  })
})

// Un monto real distinto del previsto se registra una vez y cierra solo esa ocurrencia.
test('un correo de mercado se vincula al vencimiento y conserva el monto previsto futuro', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
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
      window.inboxData = { has_more: false, events: [{ id: '550e8400-e29b-41d4-a716-446655440001', bank: 'Lulo', candidate: { counterparty: 'MERCADO PAGO D1*DISAS', amount_minor: 55430000, occurred_at: '2026-09-30T22:54:00.000Z', direction: 'outgoing', notice_kind: 'transfer_notice' } }] };
      await import('/tests/e2e/fixtures/notifications-inbox-harness.jsx');
    </script></body></html>
  ` }))
  await page.goto('/__notifications-test?review=550e8400-e29b-41d4-a716-446655440001')

  await page.getByLabel('Qué hacer con este correo').selectOption('record')
  await page.getByLabel('Tipo de movimiento').selectOption('expense')
  await page.getByLabel('Vincular gasto fijo (opcional)').selectOption('market:2026-09-30')
  await expect(page.getByLabel('Monto confirmado en COP')).toHaveValue('554.300')
  await expect(page.getByText('154.300 por encima de lo previsto.')).toBeVisible()
  await expect(page.getByLabel('Categoría').locator('option:checked')).toHaveText('Mercado')
  await page.getByLabel('Cuenta de origen').selectOption('lulo')
  await page.getByRole('checkbox', { name: 'Revisé el movimiento y confirmo esta decisión.' }).check()
  await page.getByRole('button', { name: 'Confirmar decisión' }).click()

  await expect.poll(() => page.evaluate(() => window.savedDecision?.[2])).toMatchObject({
    type: 'expense', amount_minor: 55430000, from_account_id: 'lulo', category_id: 'market-category',
  })
  await expect.poll(() => page.evaluate(() => window.savedDecision?.[5])).toMatchObject({
    expenseId: 'market', dueDate: '2026-09-30', name: 'Mercado',
  })
})

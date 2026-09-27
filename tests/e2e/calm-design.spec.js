import { expect, test } from '@playwright/test'

// Revisa todas las rutas rediseñadas sin cambiar los registros financieros de la demo.
test('rediseño: rutas, formularios, privacidad y capturas sin modificar dinero', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: /Hola, Danilo/ })).toBeVisible()
  // Completa la captura con compromisos ficticios; solo se modifica la demo aislada del test.
  await page.evaluate(async () => {
    const { db } = await import('/src/data/db.js')
    const { calendarToday } = await import('/src/domain/recurringExpenses.js')
    await db.settings.put({ key: 'fixedExpenses', value: [
      { id: 'visual-internet', name: 'Internet', amount_minor: 15000000, frequency: 'monthly', next_due_date: calendarToday(), currency: 'COP', payment_history: [] },
      { id: 'visual-market', name: 'Mercado', amount_minor: 40000000, frequency: 'biweekly', next_due_date: calendarToday(), currency: 'COP', payment_history: [] },
    ] })
  })
  const snapshot = () => page.evaluate(async () => {
    const { db } = await import('/src/data/db.js')
    const tables = ['accounts', 'transactions', 'budgets', 'goals', 'allocations', 'planned_purchases']
    return Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await db.table(table).toArray()])))
  })
  const before = await snapshot()
  await page.getByRole('button', { name: 'Ocultar montos', exact: true }).click()
  await expect(page.locator('.balance-hero__numbers > strong')).not.toContainText(/\d/)
  await page.getByRole('button', { name: 'Mostrar montos', exact: true }).click()
  await expect(page.locator('.calm-payment-row')).toHaveCount(2)
  for (const [path, name] of [['/', 'inicio'], ['/actividad', 'actividad'], ['/plan', 'plan'], ['/plan/presupuesto', 'presupuesto'], ['/cuentas', 'cuentas'], ['/cuentas/deudas', 'deudas'], ['/cuentas/gastos-fijos', 'fijos'], ['/cuentas/pagos', 'pagos'], ['/parejas', 'parejas'], ['/ajustes', 'ajustes'], ['/ajustes/automatizacion', 'atajos'], ['/ajustes/notificaciones', 'notificaciones'], ['/asistente', 'asistente']]) {
    await page.goto(path)
    await expect(page.locator('main h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/playwright/calm-${name}-${testInfo.project.name}.png`, fullPage: true })
    if (path === '/') await page.screenshot({ path: `output/playwright/glass-preview-${testInfo.project.name}.png` })
  }
  // Los nuevos accesos circulares abren el formulario correcto sin crear registros.
  await page.goto('/')
  await page.getByRole('button', { name: 'Registrar pago de deuda', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pagué una deuda', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('¿Qué deuda pagaste?', { exact: true }).locator('option:checked')).toHaveText('Tarjeta de ejemplo')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/cuentas/deudas')
  await page.getByRole('button', { name: 'Registrar pago', exact: true }).click()
  await expect(page.getByLabel('¿Qué deuda pagaste?', { exact: true }).locator('option:checked')).toHaveText('Tarjeta de ejemplo')
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/cuentas')
  for (const name of ['Deudas', 'Gastos fijos', 'Pagos', 'Dinero']) {
    await page.getByRole('navigation', { name: 'Secciones de cuentas' }).getByRole('link', { name, exact: true }).click()
    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Secciones de cuentas' }).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Agregar cuenta', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Agregar cuenta' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Registrar ingreso', exact: true }).click()
  await expect(page.locator('[data-guide="movement-income"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1')
  await expect(page.locator('.sheet-backdrop')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: `output/playwright/calm-form-${testInfo.project.name}.png` })
  await page.keyboard.press('Escape')
  await page.goto('/plan')
  await page.getByRole('button', { name: 'Crear meta', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/ajustes')
  await page.getByRole('switch', { name: 'Ocultar montos' }).click()
  await page.goto('/')
  await expect(page.locator('.balance-hero__numbers > strong')).not.toContainText(/\d/)
  await page.screenshot({ path: `output/playwright/calm-private-${testInfo.project.name}.png` })
  expect(await snapshot()).toEqual(before)
  await page.goto('/cuentas/no-existe')
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
  expect(errors).toEqual([])
})

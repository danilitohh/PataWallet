import { expect, test } from '@playwright/test'

// Comprueba el Inicio único y su detalle financiero con datos de demo aislados.
test('Inicio único conserva presupuesto, privacidad y datos con preferencias antiguas', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: /Hola, Danilo/ })).toBeVisible()
  const snapshot = () => page.evaluate(async () => {
    const { db } = await import('/src/data/db.js')
    return Promise.all(['accounts', 'transactions', 'budgets', 'goals', 'allocations', 'planned_purchases'].map((table) => db.table(table).toArray()))
  })
  const before = await snapshot()
  // Una preferencia guardada no debe recuperar la interfaz retirada ni perderse en la BD.
  for (const view of ['payday', 'activity']) {
    await page.evaluate(async (value) => {
      const { db } = await import('/src/data/db.js')
      await db.settings.put({ key: 'homeView', value })
    }, view)
    await page.reload()
    await expect(page.getByText('Saldo en cuentas', { exact: true })).toBeVisible()
    await expect(page.getByText('Otras vistas de Inicio', { exact: true })).toHaveCount(0)
    expect(await page.evaluate(async () => {
      const { db } = await import('/src/data/db.js')
      return (await db.settings.get('homeView')).value
    })).toBe(view)
  }
  const details = page.locator('.dashboard-money-details')
  const summary = details.locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(details).toHaveAttribute('open', '')
  for (const name of ['Tu presupuesto', 'Ingresos recibidos', 'Margen tras pendientes', 'Metas', 'Próximas compras', 'Cuentas']) {
    await expect(details.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  await expect(details).toHaveCSS('border-radius', '26px')
  await expect(details.locator('.budget-summary')).toHaveCSS('border-radius', '20px')
  const income = details.locator('.income-summary__value strong')
  const visibleIncome = await income.textContent()
  await expect(income).toHaveText(await page.locator('.calm-month-summary strong').first().textContent())
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/serial-check/dashboard-details-${testInfo.project.name}.png`, fullPage: true })
  // Ocultar montos se propaga a las tarjetas desplegadas sin modificar dinero.
  await page.getByRole('button', { name: 'Ocultar montos', exact: true }).click()
  await expect(income).not.toContainText(/\d/)
  await expect(details.locator('.available-money-card__value')).not.toContainText(/\d/)
  await page.getByRole('button', { name: 'Mostrar montos', exact: true }).click()
  await expect(income).toHaveText(visibleIncome)
  await details.getByRole('link', { name: 'Ver plan', exact: true }).click()
  await expect(page).toHaveURL(/\/plan$/)
  expect(await snapshot()).toEqual(before)
  expect(errors).toEqual([])
})

import { expect, test } from '@playwright/test'

// Verifica los totales mensuales reales, los filtros cronológicos y la privacidad visual en cada viewport configurado.
test('muestra la cronología mensual con datos reales y conserva los filtros', async ({ page }, testInfo) => {
  const browserErrors = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })

  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: 'Actividad' }).click()
  await expect(page).toHaveURL(/\/actividad$/)
  await expect(page.getByText('Datos de ejemplo')).toBeVisible()

  const summary = page.locator('.activity-month-summary')
  await expect(page.locator('.activity-month-picker time')).toHaveAttribute('datetime', '2026-09')
  await expect(summary).toContainText(/272\.000/)
  await expect(summary).toContainText(/3\.200\.000/)
  await expect(summary).toContainText('7 movimientos')
  await expect(page.getByRole('button', { name: /Mercado de ejemplo/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('activity-timeline.png'), fullPage: true })

  const typeFilters = page.getByRole('group', { name: 'Filtrar por tipo de movimiento' })
  await typeFilters.getByRole('button', { name: /Gastos/ }).click()
  await expect(page.locator('.activity-count')).toContainText('4')
  await expect(page.getByRole('button', { name: /Mercado de ejemplo/ })).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar movimientos' }).fill('mascotas')
  await expect(page.locator('.activity-count')).toContainText('1')
  await expect(page.getByRole('button', { name: /Tienda de mascotas de ejemplo/ })).toBeVisible()

  await page.getByRole('button', { name: 'Ver mes anterior' }).click()
  await expect(page.locator('.activity-month-picker time')).toHaveAttribute('datetime', '2026-08')
  await expect(page.getByText('No encontramos movimientos')).toBeVisible()
  await page.getByRole('button', { name: 'Ver mes siguiente' }).click()
  await expect(page.locator('.activity-month-picker time')).toHaveAttribute('datetime', '2026-09')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.locator('.activity-count')).toContainText('7')

  await page.goto('/ajustes')
  await page.getByRole('switch', { name: 'Ocultar montos' }).click()
  await expect(page.getByRole('switch', { name: 'Ocultar montos' })).toHaveAttribute('aria-checked', 'true')
  await page.goto('/actividad')
  await expect(page.locator('.activity-month-summary')).toContainText('••••••')
  await expect(page.locator('.transaction__amount strong').first()).toContainText('••••••')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  expect(browserErrors).toEqual([])
})

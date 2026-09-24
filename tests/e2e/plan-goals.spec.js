import { expect, test } from '@playwright/test'

// Verifica la jerarquía Metas primero en el viewport móvil y de escritorio configurado por Playwright.
test('prioriza la meta y mantiene visibles presupuesto, dinero libre y compras', async ({ page }) => {
  const browserErrors = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })

  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: 'Plan', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Metas y plan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Un viaje especial' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tu presupuesto' })).toBeVisible()
  await expect(page.locator('.plan-free')).toContainText('Completa tu punto de partida')
  await expect(page.getByRole('heading', { name: 'Próximas compras' })).toBeVisible()
  await expect(page.getByText('Aún no has anotado compras futuras.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  // Guarda una captura completa por viewport para la inspección visual del rediseño.
  await page.screenshot({ path: `output/playwright/results/plan-metas-${test.info().project.name}.png`, fullPage: true })
  expect(browserErrors).toEqual([])
})

// Asegura que las acciones visibles sigan abriendo los formularios productivos de Plan.
test('conecta las acciones de meta, presupuesto y compra con sus diálogos', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: 'Plan', exact: true }).click()

  await page.getByRole('button', { name: 'Apartar a esta meta' }).click()
  const allocationDialog = page.getByRole('dialog', { name: 'Reservar para Un viaje especial' })
  await expect(allocationDialog).toBeVisible()
  await allocationDialog.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Editar presupuesto' }).click()
  const budgetDialog = page.getByRole('dialog', { name: 'Editar presupuesto' })
  await expect(budgetDialog).toBeVisible()
  await budgetDialog.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Otra meta' }).click()
  const goalDialog = page.getByRole('dialog', { name: 'Nueva meta' })
  await expect(goalDialog).toBeVisible()
  await goalDialog.getByRole('button', { name: 'Cerrar' }).click()

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const purchaseDialog = page.getByRole('dialog', { name: 'Agregar próxima compra' })
  await expect(purchaseDialog).toBeVisible()
  await purchaseDialog.getByRole('button', { name: 'Cerrar' }).click()
})

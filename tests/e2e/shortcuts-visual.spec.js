import { expect, test } from '@playwright/test'

test('presenta el flujo de Atajos con estados honestos y sin enlace falso', async ({ page }, testInfo) => {
  const consoleErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.goto('/ajustes/automatizacion')
  await expect(page.getByRole('heading', { name: 'PataWallet - Registrar compra' })).toBeVisible()
  await expect(page.getByText('Plantilla pendiente de publicar').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Añadir atajo — pendiente/i })).toBeDisabled()
  await expect(page.getByText(/prueba no crea gastos/i)).toBeVisible()
  await expect(page.getByText(/no se anuncia una cola/i)).toBeVisible()
  expect(await page.locator('a[href*="icloud.com/shortcuts"]').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/phase4-shortcuts-${testInfo.project.name}.png`, fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('conserva Automatización usable en noche y con movimiento reducido', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390', 'Una captura móvil representativa basta para esta variante.')
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await expect(page.getByRole('combobox', { name: 'Tema' })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Movimiento' }).selectOption('off')
  await page.goto('/ajustes/automatizacion')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: 'output/playwright/phase4-shortcuts-mobile-dark.png', fullPage: true })
})

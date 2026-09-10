import { expect, test } from '@playwright/test'

test('entra a la demo y navega por las áreas principales', async ({ page }) => {
  await page.goto('/')
  const demoButton = page.getByRole('button', { name: /probar con datos de ejemplo/i })
  await expect(demoButton).toBeVisible()
  await demoButton.click()
  await expect(page.getByRole('heading', { name: /hola, danilo/i })).toBeVisible()
  await page.getByRole('link', { name: 'Actividad' }).click()
  await expect(page.getByRole('heading', { name: 'Actividad' })).toBeVisible()
  await page.getByRole('link', { name: 'Plan' }).click()
  await expect(page.getByRole('heading', { name: 'Tu plan' })).toBeVisible()
})

test('no produce desplazamiento horizontal', async ({ page }) => {
  await page.goto('/')
  const demoButton = page.getByRole('button', { name: /probar con datos de ejemplo/i })
  await expect(demoButton).toBeVisible()
  await demoButton.click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('registra un gasto y lo conserva al recargar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click()
  await page.getByRole('textbox', { name: /Monto/i }).fill('10.000')
  await page.getByLabel(/Categoría/).selectOption({ label: 'Mascotas' })
  await page.getByRole('textbox', { name: /Comercio o nota/i }).fill('Compra de prueba')
  await page.getByRole('button', { name: 'Guardar movimiento' }).click()
  await page.getByRole('link', { name: 'Actividad' }).click()
  await expect(page.getByText('Compra de prueba')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Compra de prueba')).toBeVisible()
})

test('oculta montos y aplica las preferencias de tema y movimiento', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await page.getByRole('switch', { name: 'Ocultar montos' }).click()
  await page.getByRole('combobox').first().selectOption('dark')
  await page.getByRole('combobox').nth(1).selectOption('off')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  await page.getByRole('link', { name: 'Inicio' }).click()
  await expect(page.getByText('••••••').first()).toBeVisible()
})

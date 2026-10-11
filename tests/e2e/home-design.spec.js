import { expect, test } from '@playwright/test'

async function openDemoHome(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Elige tu tarjeta' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar esta tarjeta' }).click()
  await expect(page.getByRole('heading', { name: 'Tu billetera está lista' })).toBeVisible()
  await page.getByRole('button', { name: /Abrir PataWallet con la tarjeta/ }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Danilo' })).toBeVisible()
}

test('ofrece dos diseños de Inicio, conserva la tarjeta y mantiene las acciones', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openDemoHome(page)

  const shell = page.locator('.app-shell')
  const walletTheme = await shell.getAttribute('data-wallet-theme')
  const accent = await shell.evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim())
  await expect(shell).toHaveAttribute('data-home-design', 'night')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: testInfo.outputPath('home-night.png'), animations: 'disabled' })

  await page.goto('/ajustes')
  const selector = page.getByRole('combobox', { name: 'Diseño del inicio', exact: true })
  await expect(selector).toHaveValue('dark')
  await selector.selectOption('light')
  await page.goto('/')
  await expect(shell).toHaveAttribute('data-home-design', 'light')
  await expect(shell).toHaveAttribute('data-wallet-theme', walletTheme)
  expect(await shell.evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim())).toBe(accent)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('home-light.png'), animations: 'disabled' })

  await page.reload()
  await expect(shell).toHaveAttribute('data-home-design', 'light')
  await page.goto('/actividad')
  await expect(shell).not.toHaveAttribute('data-home-design')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('/ajustes')
  await page.getByRole('combobox', { name: 'Diseño del inicio', exact: true }).selectOption('dark')
  await page.goto('/')
  await expect(shell).toHaveAttribute('data-home-design', 'night')

  for (const name of ['Compra', 'Ingreso', 'Pago de deuda']) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

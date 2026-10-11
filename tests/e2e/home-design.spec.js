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

async function openMovementSheet(page) {
  for (const name of ['Agregar movimiento', 'Nuevo movimiento', 'Compra']) {
    const button = page.getByRole('button', { name, exact: true })
    if (await button.isVisible()) {
      await button.click()
      return
    }
  }
  throw new Error('No encontramos el acceso para abrir el movimiento.')
}

test('aplica los dos temas a todas las secciones, conserva la tarjeta y mantiene las acciones', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openDemoHome(page)

  const shell = page.locator('.app-shell')
  const walletTheme = await shell.getAttribute('data-wallet-theme')
  const primary = await shell.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim())
  await expect(shell).toHaveAttribute('data-home-design', 'night')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: testInfo.outputPath('home-night.png'), animations: 'disabled' })

  await page.goto('/ajustes')
  const selector = page.getByRole('combobox', { name: 'Tema de la app', exact: true })
  await expect(selector).toHaveValue('dark')
  await selector.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.goto('/')
  await expect(shell).toHaveAttribute('data-home-design', 'light')
  await expect(shell).toHaveAttribute('data-app-design', 'light')
  await expect(shell).toHaveAttribute('data-wallet-theme', walletTheme)
  expect(await shell.evaluate((element) => getComputedStyle(element).getPropertyValue('--primary').trim())).toBe(primary)
  expect(await shell.evaluate((element) => getComputedStyle(element).getPropertyValue('--text').trim())).toBe('#202027')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('home-light.png'), animations: 'disabled' })

  await page.reload()
  await expect(shell).toHaveAttribute('data-home-design', 'light')
  for (const [route, screenshot] of [
    ['/actividad', 'activity-light.png'],
    ['/plan', 'plan-light.png'],
    ['/cuentas', 'accounts-light.png'],
    ['/parejas', 'couples-light.png'],
    ['/ajustes', 'settings-light.png'],
    ['/ajustes/notificaciones', 'notifications-settings-light.png'],
    ['/notificaciones', 'notifications-inbox-light.png'],
  ]) {
    await page.goto(route)
    await expect(shell).toHaveAttribute('data-app-design', 'light')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('main h1').first()).toBeVisible()
    expect(await shell.evaluate((element) => getComputedStyle(element).getPropertyValue('--text').trim())).toBe('#202027')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(screenshot), fullPage: true, animations: 'disabled' })
  }

  await page.goto('/')
  await openMovementSheet(page)
  const movementDialog = page.getByRole('dialog')
  await expect(movementDialog).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await movementDialog.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(32, 32, 39)')
  await page.screenshot({ path: testInfo.outputPath('movement-light.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(movementDialog).toHaveCount(0)

  await page.goto('/ajustes')
  await page.getByRole('combobox', { name: 'Tema de la app', exact: true }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('/')
  await expect(shell).toHaveAttribute('data-home-design', 'night')
  await expect(shell).toHaveAttribute('data-app-design', 'night')

  await openMovementSheet(page)
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

import { expect, test } from '@playwright/test'

test('elige una portada, abre la billetera y puede cambiar el diseño desde Ajustes', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()

  await expect(page.getByRole('heading', { name: 'Elige tu tarjeta' })).toBeVisible()
  const carousel = page.getByRole('group', { name: 'Diseños de tarjeta' })
  await expect(page.getByRole('group', { name: 'Tarjeta Guacamayas, 1 de 5' })).toBeVisible()
  await expect(carousel.getByRole('button')).toHaveCount(2)
  await expect(page.getByRole('button')).toHaveCount(3)
  expect(await page.locator('.wallet-card-picker__art').evaluate((element) => getComputedStyle(element, '::after').content)).toBe('""')
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`wallet-card-picker-${viewport.width}.png`), fullPage: true })
  }
  await page.setViewportSize(testInfo.project.use.viewport)
  const artwork = page.locator('.wallet-card-picker__art')
  const box = await artwork.boundingBox()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByRole('img', { name: /Tres gatos/ })).toBeVisible()
  await artwork.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('img', { name: /Tres perros/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ver diseño anterior' }).click()
  await expect(page.getByRole('img', { name: /Tres gatos/ })).toBeVisible()
  await page.getByRole('button', { name: 'Usar esta tarjeta' }).click()

  await expect(page.getByRole('heading', { name: 'Tu billetera está lista' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir PataWallet con la tarjeta Gatos' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('wallet-card-entry.png'), fullPage: true })
  await page.getByRole('button', { name: 'Abrir PataWallet con la tarjeta Gatos' }).click()
  await expect(page.getByText('Saldo en cuentas')).toBeVisible()

  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }

  await page.goto('/ajustes')
  await expect(page.getByText(/Diseño Gatos/)).toBeVisible()
  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Elige tu tarjeta' })).toBeVisible()
  for (let next = 0; next < 3; next += 1) {
    await page.getByRole('button', { name: 'Ver diseño siguiente' }).click()
  }
  await expect(page.getByRole('img', { name: /Dos nutrias/ })).toBeVisible()
  await page.getByRole('button', { name: 'Usar esta tarjeta' }).click()
  await expect(page.getByText(/Diseño Nutrias/)).toBeVisible()

  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tu billetera está lista' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir PataWallet con la tarjeta Nutrias' })).toBeVisible()
})

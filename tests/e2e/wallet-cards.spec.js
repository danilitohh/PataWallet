import { expect, test } from '@playwright/test'

test('elige una portada, abre la billetera y puede cambiar el diseño desde Ajustes', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()

  await expect(page.getByRole('heading', { name: 'Elige tu tarjeta' })).toBeVisible()
  const cardChoices = page.getByRole('group', { name: 'Diseños de tarjeta' })
  await expect(cardChoices.getByRole('button')).toHaveCount(5)
  for (const name of ['Guacamayas', 'Gatos', 'Perros', 'Conejos', 'Nutrias']) {
    await expect(cardChoices.getByRole('button', { name: new RegExp(name) })).toBeVisible()
  }
  for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`wallet-card-picker-${viewport.width}.png`), fullPage: true })
  }
  await page.setViewportSize(testInfo.project.use.viewport)
  await cardChoices.getByRole('button', { name: /Gatos/ }).click()
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
  await page.getByRole('group', { name: 'Diseños de tarjeta' }).getByRole('button', { name: /Nutrias/ }).click()
  await page.getByRole('button', { name: 'Usar esta tarjeta' }).click()
  await expect(page.getByText(/Diseño Nutrias/)).toBeVisible()

  await page.evaluate(() => sessionStorage.clear())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tu billetera está lista' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir PataWallet con la tarjeta Nutrias' })).toBeVisible()
})

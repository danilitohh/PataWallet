import { expect, test } from '@playwright/test'

test('captura la pantalla de notificaciones para revisión visual', async ({ page }, testInfo) => {
  const consoleErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.goto('/ajustes/notificaciones')
  await expect(page.getByRole('heading', { name: 'Avisos privados de PataWallet' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/phase3-notifications-${testInfo.project.name}.png`, fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('explica el requisito de instalación solo desde Safari en iPhone', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: false, configurable: true }))
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await expect(page.getByRole('heading', { name: /hola, danilo/i })).toBeVisible()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await page.getByRole('link', { name: 'Notificaciones' }).click()

  await expect(page.getByRole('heading', { name: '¿Por qué tengo que instalarla?' })).toBeVisible()
  await expect(page.getByText(/Una pestaña de Safari no puede recibir avisos web/)).toBeVisible()
  await expect(page.getByRole('link', { name: /pasos oficiales de apple/i })).toHaveAttribute('href', /open-as-web-app|iphea86e5236/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/notifications-iphone-install-${testInfo.project.name}.png`, fullPage: true })
})

test('no repite las instrucciones cuando PataWallet ya está instalada', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }))
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await expect(page.getByRole('heading', { name: /hola, danilo/i })).toBeVisible()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await page.getByRole('link', { name: 'Notificaciones' }).click()

  await expect(page.getByRole('heading', { name: 'Avisos privados de PataWallet' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Por qué tengo que instalarla?' })).toHaveCount(0)
})

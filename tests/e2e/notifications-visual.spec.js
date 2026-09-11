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

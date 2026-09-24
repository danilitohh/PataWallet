import { expect, test } from '@playwright/test'

test('conserva el aviso nativo disponible antes de abrir Ajustes', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.pwaPromptCalls = 0
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = () => { window.pwaPromptCalls += 1 }
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
    window.dispatchEvent(event)
    window.pwaPromptPrevented = event.defaultPrevented
  })

  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Instalar PataWallet' })).toBeVisible()
  await page.getByRole('button', { name: 'Instalar' }).click()

  await expect.poll(() => page.evaluate(() => window.pwaPromptCalls)).toBe(1)
  expect(await page.evaluate(() => window.pwaPromptPrevented)).toBe(true)
  await expect(page.getByRole('status')).toContainText('Confirmaste la instalación')

  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(page.getByText('PataWallet está instalada')).toBeVisible()
})

test('muestra instrucciones de Safari cuando no existe un aviso nativo', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-390', 'La guía de iPhone solo requiere validación en un viewport móvil.')
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await page.getByRole('button', { name: 'Ver pasos' }).click()

  await expect(page.getByText(/En iPhone o iPad, Safari requiere completar este paso/)).toBeVisible()
  await expect(page.locator('#pwa-install-guide li')).toHaveCount(3)
  await expect(page.getByText('Abrir como app web')).toBeVisible()
})

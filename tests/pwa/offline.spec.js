import { expect, test } from '@playwright/test'

test('instala un único worker y abre una ruta interna sin conexión', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistrations().then((items) => items.length))).toBe(1)
  await page.goto('/ajustes/notificaciones')
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Avisos privados de PataWallet' })).toBeVisible()
  await context.setOffline(false)
})

test('el service worker deja abrir el tutorial MP4 como recurso estático', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.goto('/ajustes/automatizacion')

  const tutorial = page.getByRole('link', { name: /abrir el tutorial de automatización en video/i })
  const [videoPage] = await Promise.all([page.waitForEvent('popup'), tutorial.click()])
  await videoPage.waitForLoadState('domcontentloaded')
  await expect.poll(() => videoPage.evaluate(() => document.contentType)).toBe('video/mp4')
})

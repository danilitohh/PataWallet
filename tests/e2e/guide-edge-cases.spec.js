import { expect, test } from '@playwright/test'

// Aísla la demo vacía: nunca toca cuentas remotas ni usa datos personales.
test('guía vacía, montos ocultos, cambio de tamaño y salida offline', async ({ page, context }) => {
  test.setTimeout(90000)
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await expect(page.getByRole('heading', { name: /Hola, Danilo/i })).toBeVisible()
  await page.evaluate(async () => {
    const { db } = await import('/src/data/db.js')
    for (const name of ['accounts', 'transactions', 'budgets', 'goals', 'allocations', 'planned_purchases']) await db.table(name).clear()
    await db.settings.put({ key: 'hiddenAmounts', value: true })
    await db.settings.put({ key: 'homeView', value: 'payday' })
  })
  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Ver guía', exact: true }).click()
  const guide = page.locator('.first-use-guide')
  for (const step of ['home', 'account', 'add']) {
    await expect(guide).toHaveAttribute('data-anchored-step', step)
    await expect(guide).toHaveAttribute('data-target-found', 'true')
    if (step !== 'add') await guide.getByRole('button', { name: 'Siguiente' }).click()
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(async () => {
    const box = await page.locator('.guide-spotlight').boundingBox()
    return box && box.x > 0 && box.x + box.width < 375
  }).toBeTruthy()
  await guide.getByRole('button', { name: 'Siguiente' }).click()
  await expect(guide).toHaveAttribute('data-anchored-step', 'income')
  await expect(page.locator('.sheet-backdrop--guide')).toContainText('No hay cuentas disponibles')
  await context.setOffline(true)
  await page.keyboard.press('Escape')
  await expect(guide).toHaveCount(0)
  await expect(page).toHaveURL(/\/ajustes$/)
  await expect(page.getByRole('switch', { name: 'Ocultar montos' })).toBeChecked()
  await page.getByRole('button', { name: 'Instalación y Atajos', exact: true }).click()
  await expect(guide).toHaveAttribute('data-target-found', 'true')
  // Simula un control no disponible para comprobar que el recorrido siempre permite salir.
  await page.locator('.pwa-install__row').evaluate((element) => element.remove())
  await expect(guide).toHaveAttribute('data-target-found', 'false')
  await expect(guide.getByRole('status')).toBeVisible()
  await guide.getByRole('button', { name: 'Saltar recorrido' }).click()
  await expect(guide).toHaveCount(0)
  await context.setOffline(false)
})

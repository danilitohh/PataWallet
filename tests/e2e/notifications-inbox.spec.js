import { expect, test } from '@playwright/test'

// The header bell must open the focused inbox, not bank-email connection settings.
test('la campana abre solo la bandeja de notificaciones', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  if (testInfo.project.name.startsWith('mobile-')) {
    const bell = page.getByRole('link', { name: /abrir avisos/i })
    await expect(bell).toBeVisible()
    await bell.click({ force: true })
  } else {
    await page.goto('/notificaciones')
  }

  await expect(page).toHaveURL(/\/notificaciones$/)
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await expect(page.getByText('Los avisos de correo bancario aparecerán aquí cuando uses tu cuenta.')).toBeVisible()
  await expect(page.getByText('Conecta tu correo', { exact: true })).toHaveCount(0)
})

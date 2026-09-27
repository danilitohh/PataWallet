import { expect, test } from '@playwright/test'

// Comprueba apertura y cierre con animaciones activas, además del recorrido reducido.
test('los accesos circulares cierran el formulario sin guardar ni dejar el fondo inerte', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  for (const name of ['Registrar movimiento', 'Registrar ingreso', 'Registrar pago de deuda']) {
    await page.locator('main').getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.app-shell')).not.toHaveAttribute('inert')
  }
})

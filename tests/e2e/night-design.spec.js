import { expect, test } from '@playwright/test'

// Recorre la interfaz real en los tres tamaños del proyecto y espera las imágenes visibles.
test('mantiene el diseño noche sin desbordes en todos los módulos', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Danilo' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const routes = [['home', '/'], ['activity', '/actividad'], ['plan', '/plan'], ['accounts', '/cuentas'], ['settings', '/ajustes'], ['assistant', '/asistente']]
  for (const [name, route] of routes) {
    await page.goto(route)
    await expect(page.locator('.page-header')).toBeVisible()
    await page.evaluate(() => Promise.all([...document.images].filter((image) => image.getClientRects().length).map((image) => { image.loading = 'eager'; return image.decode() })))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/playwright/night-${name}-${testInfo.project.name}.png`, animations: 'disabled' })
  }
  expect(errors).toEqual([])
})

// La profundidad táctil debe existir en los controles compartidos y conservarse con la preferencia de movimiento reducido.
test('aplica profundidad 3D accesible a botones e iconos', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Danilo' })).toBeVisible()

  const depth = await page.evaluate(() => {
    const button = document.querySelector('.side-nav__add')
    const icon = document.querySelector('.transaction__icon')
    const root = getComputedStyle(document.documentElement)
    return {
      buttonShadow: getComputedStyle(button).boxShadow,
      iconShadow: getComputedStyle(icon).boxShadow,
      depthToken: root.getPropertyValue('--depth-shadow').trim(),
    }
  })
  expect(depth.buttonShadow).not.toBe('none')
  expect(depth.iconShadow).not.toBe('none')
  expect(depth.depthToken).not.toBe('')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hola, Danilo' })).toBeVisible()
  const reducedDuration = await page.locator('.side-nav__add').evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration))
  expect(reducedDuration).toBeLessThan(0.001)
})

// El tema oscuro es único y la reducción del sistema prevalece sobre «Suave».
test('mantiene tema oscuro y reduce efectos por sistema o preferencia propia', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Danilo' })).toBeVisible()
  await page.goto('/ajustes')
  await expect(page.getByText('Modo nocturno')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Tema', exact: true })).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('combobox', { name: 'Movimiento', exact: true }).selectOption('soft')
  await expect(page.locator('.night-ambience span').first()).toHaveCSS('animation-name', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('combobox', { name: 'Movimiento', exact: true }).selectOption('off')
  await expect(page.locator('.night-ambience span').first()).toHaveCSS('animation-name', 'none')
})

// Comprueba chips, estado vacío y recuperación de un formulario inválido sin perder su importe.
test('filtra desde chips y conserva el monto cuando falta categoría', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Probar con datos de ejemplo' }).click()
  await expect(page.getByRole('heading', { name: 'Hola, Danilo' })).toBeVisible()
  await page.goto('/actividad')
  await page.getByRole('button', { name: 'Ingresos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ingresos', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.transaction')).toHaveCount(1)
  await page.getByRole('textbox', { name: 'Buscar movimientos' }).fill('sin-resultados-visual')
  await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevo movimiento' })
  await dialog.getByRole('textbox', { name: /Monto/ }).fill('25000')
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Elige una categoría.')
  await expect(dialog.getByRole('textbox', { name: /Monto/ })).toHaveValue('25.000')
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'No encontramos movimientos' })).toBeVisible()
})

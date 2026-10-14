import { expect, test } from '@playwright/test'

test('activa el desbloqueo biométrico local y lo solicita al volver a abrir', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const rawId = new Uint8Array([11, 22, 33, 44])
    const credentialId = 'mock-credential'
    let authenticationAttempts = 0
    window.__patawalletAuthenticationAttempts = 0
    class TestPublicKeyCredential {}
    TestPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true
    Object.defineProperty(window, 'PublicKeyCredential', { configurable: true, value: TestPublicKeyCredential })
    Object.defineProperty(navigator, 'credentials', {
      configurable: true,
      value: {
        create: async () => ({ id: credentialId, rawId }),
        get: async () => {
          authenticationAttempts += 1
          window.__patawalletAuthenticationAttempts = authenticationAttempts
          if (authenticationAttempts === 1) throw new DOMException('User cancelled', 'NotAllowedError')
          const authenticatorData = new Uint8Array(37)
          authenticatorData[32] = 4
          return { id: credentialId, rawId, response: { authenticatorData } }
        },
      },
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: /probar con datos de ejemplo/i }).click()
  await page.getByRole('button', { name: 'Usar esta tarjeta' }).click()
  await page.getByRole('link', { name: /ajustes/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Seguridad' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('biometric-settings.png'), fullPage: true })
  await page.getByRole('switch', { name: 'Desbloqueo biométrico' }).click()
  await expect(page.getByText(/desbloqueo biométrico activado/i)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Desbloquea PataWallet' })).toBeVisible()
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.__patawalletAuthenticationAttempts)).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('biometric-lock.png'), fullPage: true })
  await page.getByRole('button', { name: /desbloquear con biometría/i }).click()
  await expect(page.getByRole('alert')).toContainText(/No se confirmó la biometría/)
  await page.getByRole('button', { name: /desbloquear con biometría/i }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()

  await page.goto('/?apertura=normal')
  await expect.poll(() => page.evaluate(() => window.__patawalletAuthenticationAttempts)).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: 'Desbloquea PataWallet' })).toBeVisible()
  await page.getByRole('button', { name: /desbloquear con biometría/i }).click()
  await expect(page.getByRole('heading', { name: 'Balance' })).toBeVisible()
})

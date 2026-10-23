import { describe, expect, it } from 'vitest'
import { clearBiometricCredential, hasBiometricCredential, readBiometricCredential } from './biometricUnlock.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

describe('credencial biométrica local', () => {
  it('separa la credencial por espacio y no expone datos inválidos', () => {
    const storage = memoryStorage()
    storage.setItem('patawallet:biometric-unlock:v1:user-a', JSON.stringify({ credentialId: 'credential-a' }))
    expect(hasBiometricCredential('user-a', storage)).toBe(true)
    expect(hasBiometricCredential('user-b', storage)).toBe(false)
    expect(readBiometricCredential('user-a', storage)?.credentialId).toBe('credential-a')
    storage.setItem('patawallet:biometric-unlock:v1:user-b', '{malformed')
    expect(readBiometricCredential('user-b', storage)).toBeNull()
  })

  it('permite desactivar el bloqueo sin tocar datos financieros', () => {
    const storage = memoryStorage()
    storage.setItem('patawallet:biometric-unlock:v1:demo', JSON.stringify({ credentialId: 'credential-demo' }))
    clearBiometricCredential('demo', storage)
    expect(hasBiometricCredential('demo', storage)).toBe(false)
  })
})

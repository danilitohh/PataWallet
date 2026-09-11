import { describe, expect, it, vi } from 'vitest'
import { classifyPushState, detectPushCapabilities, serializeSubscription, urlBase64ToUint8Array } from './pushCapabilities.js'

describe('Web Push', () => {
  it('no solicita permiso durante la detección', () => {
    const requestPermission = vi.fn()
    const scope = { isSecureContext: true, navigator: { serviceWorker: {}, standalone: false }, PushManager() {}, Notification: { requestPermission }, matchMedia: () => ({ matches: false }) }
    expect(detectPushCapabilities(scope).appleHomeScreenRequired).toBe(true)
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('distingue permiso de suscripción activa', () => {
    const capabilities = { secure: true, serviceWorker: true, pushManager: true, notifications: true, standalone: true }
    expect(classifyPushState({ capabilities, permission: 'granted', configured: true }).kind).toBe('granted')
    expect(classifyPushState({ capabilities, permission: 'granted', configured: true, subscription: {} }).kind).toBe('active')
    expect(classifyPushState({ capabilities, permission: 'denied', configured: true }).kind).toBe('denied')
    expect(classifyPushState({ capabilities: { ...capabilities, pushManager: false }, permission: 'default', configured: true }).kind).toBe('unsupported')
    expect(classifyPushState({ capabilities, permission: 'denied', configured: true, subscription: {} }).kind).toBe('denied')
  })

  it('convierte la clave VAPID y serializa únicamente el contrato permitido', () => {
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3])
    expect(serializeSubscription({ toJSON: () => ({ endpoint: 'https://push.example.test/a', keys: { p256dh: 'p', auth: 'a' } }) })).toEqual({ endpoint: 'https://push.example.test/a', expirationTime: null, keys: { p256dh: 'p', auth: 'a' } })
  })
})

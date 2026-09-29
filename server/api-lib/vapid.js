// Deriva la clave pública VAPID cuando el proveedor solo expone la privada al runtime.
import { createECDH } from 'node:crypto'

export function getVapidPublicKey() {
  const configured = process.env.VAPID_PUBLIC_KEY?.trim()
  if (configured) return configured

  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!privateKey) return ''
  try {
    const ecdh = createECDH('prime256v1')
    const privateBytes = Buffer.from(privateKey, 'base64url')
    if (privateBytes.length !== 32) return ''
    ecdh.setPrivateKey(privateBytes)
    return ecdh.getPublicKey('base64url')
  } catch {
    return ''
  }
}

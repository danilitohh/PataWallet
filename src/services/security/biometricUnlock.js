const storagePrefix = 'patawallet:biometric-unlock:v1:'

// El identificador de una credencial no es un secreto; la clave privada permanece
// dentro del autenticador del sistema y nunca se copia a la app.
function storageKey(ownerId) {
  return `${storagePrefix}${encodeURIComponent(String(ownerId || ''))}`
}

function resolveStorage(storage) {
  if (storage) return storage
  try { return globalThis.localStorage } catch { return null }
}

function encodeBase64Url(bytes) {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodeBase64Url(value) {
  const normalized = String(value).replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function randomChallenge(scope) {
  const bytes = new Uint8Array(32)
  scope.crypto.getRandomValues(bytes)
  return bytes
}

function relyingPartyId(scope) {
  const hostname = scope.location?.hostname
  return hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' ? hostname : undefined
}

function browserApi(scope) {
  return {
    credentials: scope.navigator?.credentials,
    PublicKeyCredential: scope.PublicKeyCredential,
  }
}

export function readBiometricCredential(ownerId, storage) {
  const target = resolveStorage(storage)
  if (!target || !ownerId) return null
  try {
    const raw = target.getItem(storageKey(ownerId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.credentialId !== 'string' || !parsed.credentialId) return null
    return { credentialId: parsed.credentialId, registeredAt: parsed.registeredAt || null }
  } catch {
    return null
  }
}

export function hasBiometricCredential(ownerId, storage) {
  return Boolean(readBiometricCredential(ownerId, storage)?.credentialId)
}

export function clearBiometricCredential(ownerId, storage) {
  const target = resolveStorage(storage)
  if (!target || !ownerId) return
  try { target.removeItem(storageKey(ownerId)) } catch { /* El almacenamiento local puede estar bloqueado. */ }
}

export function isWebAuthnSupported(scope = globalThis) {
  const { credentials, PublicKeyCredential } = browserApi(scope)
  return Boolean(credentials?.create && credentials?.get && PublicKeyCredential)
}

export async function isPlatformAuthenticatorAvailable(scope = globalThis) {
  const { PublicKeyCredential } = browserApi(scope)
  if (!isWebAuthnSupported(scope) || typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return false
  return Boolean(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
}

export async function detectBiometricCapability(scope = globalThis) {
  if (!isWebAuthnSupported(scope)) return { supported: false, label: 'No disponible en este navegador' }
  try {
    const supported = await isPlatformAuthenticatorAvailable(scope)
    return {
      supported,
      label: supported ? biometricLabel(scope) : 'No hay biometría disponible en este dispositivo',
    }
  } catch {
    return { supported: false, label: 'No pudimos comprobar el autenticador del dispositivo' }
  }
}

function biometricLabel(scope) {
  const userAgent = scope.navigator?.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'Face ID o Touch ID, según tu dispositivo'
  if (/Android/i.test(userAgent)) return 'Huella, rostro o método del dispositivo'
  return 'Biometría del dispositivo'
}

function requireCredential(credential) {
  if (!credential?.rawId || !credential.id) throw new Error('El dispositivo no creó una credencial biométrica.')
  return { credentialId: credential.id, registeredAt: new Date().toISOString() }
}

export async function registerBiometricCredential(ownerId, scope = globalThis, storage) {
  if (!ownerId) throw new Error('No pudimos identificar este espacio.')
  if (!isWebAuthnSupported(scope)) throw new Error('Este navegador no permite desbloqueo biométrico.')
  const { credentials } = browserApi(scope)
  const userId = new TextEncoder().encode(`patawallet:${ownerId}`).slice(0, 64)
  const credential = await credentials.create({ publicKey: {
    challenge: randomChallenge(scope),
    rp: { name: 'PataWallet', id: relyingPartyId(scope) },
    user: { id: userId, name: `patawallet-${String(ownerId).slice(0, 24)}`, displayName: 'PataWallet' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
    timeout: 60_000,
    attestation: 'none',
  } })
  const saved = requireCredential(credential)
  const target = resolveStorage(storage)
  if (!target) throw new Error('No pudimos guardar la configuración en este dispositivo.')
  try {
    target.setItem(storageKey(ownerId), JSON.stringify(saved))
  } catch {
    throw new Error('No pudimos guardar la configuración en este dispositivo.')
  }
  return saved
}

export async function authenticateBiometric(ownerId, scope = globalThis, storage) {
  const saved = readBiometricCredential(ownerId, storage)
  if (!saved) throw new Error('Configura primero el desbloqueo biométrico en Ajustes.')
  if (!isWebAuthnSupported(scope)) throw new Error('Este navegador ya no permite desbloqueo biométrico.')
  const { credentials } = browserApi(scope)
  const assertion = await credentials.get({ publicKey: {
    challenge: randomChallenge(scope),
    rpId: relyingPartyId(scope),
    allowCredentials: [{ type: 'public-key', id: decodeBase64Url(saved.credentialId) }],
    userVerification: 'required',
    timeout: 60_000,
  } })
  const returnedId = assertion?.id || encodeBase64Url(assertion?.rawId || new Uint8Array())
  if (returnedId !== saved.credentialId) throw new Error('La credencial del dispositivo no coincide con este espacio.')
  const authenticatorData = new Uint8Array(assertion.response?.authenticatorData || [])
  // Bit UV del authenticatorData: el sistema confirmó una verificación de usuario.
  if (authenticatorData.length < 37 || (authenticatorData[32] & 0x04) === 0) throw new Error('El dispositivo no confirmó tu identidad biométrica.')
  return true
}

export function biometricErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return 'No se confirmó la biometría. Inténtalo de nuevo cuando quieras.'
  if (error?.name === 'InvalidStateError') return 'Esta credencial ya está registrada en el dispositivo.'
  if (error?.name === 'SecurityError') return 'El navegador bloqueó la biometría en este origen. Usa la app instalada o una conexión segura.'
  return error?.message || 'No pudimos confirmar la biometría.'
}

export function notifyBiometricPreferenceChanged() {
  try { window.dispatchEvent(new Event('patawallet:biometric-changed')) } catch { /* No hay ventana en pruebas o renderizado previo. */ }
}

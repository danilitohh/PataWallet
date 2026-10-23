import { useCallback, useEffect, useRef, useState } from 'react'
import { Fingerprint, ShieldCheck } from 'lucide-react'
import { authenticateBiometric, biometricErrorMessage } from '../../services/security/biometricUnlock.js'
import './biometric.css'

const BIOMETRIC_AUTOPROMPT_DELAY = 250

function isReloadNavigation() {
  try {
    const navigationEntry = window.performance?.getEntriesByType?.('navigation')?.[0]
    return navigationEntry?.type === 'reload' || window.performance?.navigation?.type === 1
  } catch {
    return false
  }
}

// Este bloqueo protege la sesión persistida en este dispositivo; la autenticación de la cuenta sigue dependiendo de Supabase.
export function BiometricGate({ ownerId, enabled, children }) {
  const [skipInitialAutoPrompt] = useState(() => isReloadNavigation())
  const [unlocked, setUnlocked] = useState(() => !enabled || skipInitialAutoPrompt)
  const [status, setStatus] = useState(enabled ? 'ready' : 'disabled')
  const [error, setError] = useState('')
  const attemptRef = useRef(null)
  const identityRef = useRef({ ownerId, enabled })

  const unlock = useCallback(async () => {
    if (!enabled || !ownerId) return
    if (attemptRef.current) return attemptRef.current
    setStatus('checking')
    setError('')
    const attempt = authenticateBiometric(ownerId)
      .then(() => {
        setUnlocked(true)
        setStatus('unlocked')
      })
      .catch((issue) => {
        setUnlocked(false)
        setStatus('error')
        setError(biometricErrorMessage(issue))
      })
      .finally(() => { attemptRef.current = null })
    attemptRef.current = attempt
    return attempt
  }, [enabled, ownerId])

  useEffect(() => {
    const previous = identityRef.current
    identityRef.current = { ownerId, enabled }
    if (!enabled) return undefined
    const enabledDuringSession = !previous.enabled && enabled && previous.ownerId === ownerId
    if (enabledDuringSession || skipInitialAutoPrompt) {
      // La persona acaba de confirmar la biometría al activarla en Ajustes.
      return undefined
    }
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') void unlock()
    }, BIOMETRIC_AUTOPROMPT_DELAY)
    return () => window.clearTimeout(timer)
  }, [enabled, ownerId, skipInitialAutoPrompt, unlock])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && enabled) {
        setUnlocked(false)
        setStatus('ready')
      }
      if (document.visibilityState === 'visible' && enabled && !unlocked) void unlock()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [enabled, unlock, unlocked])

  if (!enabled || unlocked) return children
  return <BiometricLockScreen status={status} error={error} onUnlock={unlock} />
}

function BiometricLockScreen({ status, error, onUnlock }) {
  const busy = status === 'checking'
  return <main className="biometric-lock" aria-labelledby="biometric-lock-title">
    <div className="biometric-lock__content">
      <div className="biometric-lock__icon" aria-hidden="true"><Fingerprint /></div>
      <p className="eyebrow">Espacio privado</p>
      <h1 id="biometric-lock-title">Desbloquea PataWallet</h1>
      <p>Confirma con Face ID, Touch ID o la huella del dispositivo para ver tus finanzas.</p>
      {error && <p className="biometric-lock__error" role="alert">{error}</p>}
      <button className="button button--primary biometric-lock__button" type="button" onClick={onUnlock} disabled={busy}>
        <ShieldCheck aria-hidden="true" /> {busy ? 'Comprobando…' : 'Desbloquear con biometría'}
      </button>
      <small>Tu rostro o huella no se guardan en PataWallet. El celular realiza la comprobación.</small>
    </div>
  </main>
}

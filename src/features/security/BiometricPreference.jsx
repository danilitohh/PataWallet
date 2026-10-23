import { useEffect, useState } from 'react'
import { Fingerprint } from 'lucide-react'
import { SettingRow, Switch } from '../settings/components/SettingsControls.jsx'
import { biometricErrorMessage, clearBiometricCredential, detectBiometricCapability, hasBiometricCredential, notifyBiometricPreferenceChanged, registerBiometricCredential } from '../../services/security/biometricUnlock.js'

// La credencial es local al dispositivo: otro teléfono debe registrar su propio Face ID o huella.
export function BiometricPreference({ ownerId, notify }) {
  const [enabled, setEnabled] = useState(() => hasBiometricCredential(ownerId))
  const [capability, setCapability] = useState({ status: 'checking', supported: false, label: 'Comprobando dispositivo…' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    detectBiometricCapability().then((result) => { if (active) setCapability({ status: 'ready', ...result }) })
    const refresh = () => setEnabled(hasBiometricCredential(ownerId))
    window.addEventListener('patawallet:biometric-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('patawallet:biometric-changed', refresh)
    }
  }, [ownerId])

  const setBiometric = async (next) => {
    setError('')
    if (!next) {
      clearBiometricCredential(ownerId)
      setEnabled(false)
      notifyBiometricPreferenceChanged()
      notify('Desbloqueo biométrico desactivado en este dispositivo')
      return
    }
    if (!capability.supported) return
    setBusy(true)
    try {
      await registerBiometricCredential(ownerId)
      setEnabled(true)
      notifyBiometricPreferenceChanged()
      notify('Desbloqueo biométrico activado en este dispositivo')
    } catch (issue) {
      setError(biometricErrorMessage(issue))
    } finally {
      setBusy(false)
    }
  }

  const detail = capability.status === 'checking'
    ? capability.label
    : enabled
      ? 'Este dispositivo pedirá su biometría al volver a abrir la app.'
      : capability.supported
        ? `Al activarla, el celular mostrará ${capability.label.toLowerCase()}.`
        : `${capability.label}. Prueba desde Safari o Chrome en una conexión segura.`

  return <>
    <SettingRow icon={Fingerprint} tone="violet" title="Desbloqueo biométrico" detail={detail}>
      <Switch checked={enabled} label="Desbloqueo biométrico" onChange={setBiometric} disabled={busy || capability.status === 'checking' || (!enabled && !capability.supported)} />
    </SettingRow>
    {busy && <p className="biometric-preference__status" role="status">Confirma la biometría en tu dispositivo…</p>}
    {error && <p className="biometric-preference__error" role="alert">{error}</p>}
    {enabled && <p className="biometric-preference__note">La configuración es local y no se sincroniza con otros dispositivos. El sistema decide si usa Face ID, Touch ID, huella u otro método compatible.</p>}
  </>
}

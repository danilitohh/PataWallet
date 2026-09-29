import { useCallback, useEffect, useMemo, useState } from 'react'
import { activatePush, currentBrowserSubscription, deactivatePush, reconcilePushSubscription, savePushPreferences, sendTestPush, storedSubscriptionId } from '../../../services/push/pushClient.js'
import { classifyPushState, detectPushCapabilities } from '../../../services/push/pushCapabilities.js'
const defaults = { movements: true, budgets: true, review: true, showDetails: false }

export function usePushNotifications(user, isDemo) {
  const [vapidPublicKey, setVapidPublicKey] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [preferences, setPreferences] = useState(defaults)
  const [permissionState, setPermissionState] = useState(() => ('Notification' in window ? Notification.permission : 'default'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState(null)
  const capabilities = useMemo(() => detectPushCapabilities(window), [])
  const permission = capabilities.notifications ? permissionState : 'default'

  // Obtiene la clave pública desde el servidor para no duplicarla en variables Vite.
  useEffect(() => {
    if (isDemo) return undefined
    let mounted = true
    fetch('/api/push/config', { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar la configuración de notificaciones.')))
      .then((config) => { if (mounted) setVapidPublicKey(typeof config.publicKey === 'string' ? config.publicKey.trim() : '') })
      .catch(() => { if (mounted) setVapidPublicKey('') })
    return () => { mounted = false }
  }, [isDemo])

  const refresh = useCallback(async () => {
    if (isDemo || !user || !vapidPublicKey || !capabilities.serviceWorker || !capabilities.pushManager) return
    try {
      if (permission === 'denied') {
        await deactivatePush(user.id)
        setSubscription(null)
        return
      }
      if (permission !== 'granted') return
      const active = await reconcilePushSubscription(user.id)
      setSubscription(active?.subscription || null)
      if (active?.record?.preferences) setPreferences(active.record.preferences)
    } catch (issue) {
      setError(issue.message)
      setSubscription(await currentBrowserSubscription().catch(() => null))
    }
  }, [capabilities.pushManager, capabilities.serviceWorker, isDemo, permission, user, vapidPublicKey])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const syncPermission = () => setPermissionState('Notification' in window ? Notification.permission : 'default')
    document.addEventListener('visibilitychange', syncPermission)
    return () => document.removeEventListener('visibilitychange', syncPermission)
  }, [])

  const activate = async () => {
    setBusy(true); setError(''); setTestResult(null)
    try {
      const result = await activatePush(user.id, vapidPublicKey, preferences)
      setPermissionState(result.permission)
      setSubscription(result.subscription)
    } catch (issue) { setError(issue.message) } finally { setBusy(false) }
  }

  const deactivate = async () => {
    setBusy(true); setError(''); setTestResult(null)
    try {
      const result = await deactivatePush(user.id)
      setSubscription(null)
      if (!result.serverRemoved) setError('Se desactivó en este dispositivo, pero el servidor no pudo confirmarlo. Revisa de nuevo cuando tengas conexión.')
    } catch (issue) { setError(issue.message) } finally { setBusy(false) }
  }

  const updatePreference = async (key, value) => {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    if (!subscription) return
    setBusy(true); setError('')
    try { await savePushPreferences(user.id, subscription, next) } catch (issue) { setPreferences(preferences); setError(issue.message) } finally { setBusy(false) }
  }

  const sendTest = async () => {
    const id = storedSubscriptionId(user.id)
    if (!id) return setError('Falta confirmar la suscripción en el servidor.')
    setBusy(true); setError(''); setTestResult({ kind: 'requested', text: 'Solicitud de prueba creada…' })
    try {
      const result = await sendTestPush(id)
      setTestResult({ kind: 'accepted', text: result.message })
    } catch (issue) { setTestResult({ kind: 'failed', text: issue.message }) } finally { setBusy(false) }
  }

  const state = isDemo
    ? { kind: 'demo', label: 'Solo para cuentas reales', detail: 'La demo no registra suscripciones ni envía datos al servidor.' }
    : classifyPushState({ capabilities, permission, subscription, configured: Boolean(vapidPublicKey), error })
  return { state, capabilities, permission, subscription, preferences, busy, testResult, activate, deactivate, updatePreference, sendTest }
}

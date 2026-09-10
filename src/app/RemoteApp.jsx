import { useCallback, useEffect, useMemo, useState } from 'react'
import { Workspace } from './Workspace.jsx'
import { SyncController } from '../services/sync/syncController.js'
import { LoadingScreen, StateMessage } from '../shared/components/Feedback.jsx'

export function RemoteApp({ user, signOut }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [syncState, setSyncState] = useState({ kind: 'local', label: 'Guardado en este dispositivo', pending: 0, conflicts: 0 })
  const controller = useMemo(() => new SyncController(user.id), [user.id])
  const refresh = useCallback(async (nextData, nextSyncState) => {
    setData(nextData || await controller.snapshot())
    setSyncState(nextSyncState || await controller.state())
  }, [controller])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const next = await controller.initialize()
        if (active) setData(next)
      } catch (issue) {
        if (active) setError(issue.message || 'No pudimos cargar tus datos.')
      }
    })()
    const unsubscribe = controller.subscribe(async (state) => {
      if (active) {
        setSyncState(state)
        setData(await controller.snapshot())
      }
    })
    return () => { active = false; unsubscribe(); controller.dispose() }
  }, [controller])

  const actions = useMemo(() => controller.actions(refresh), [controller, refresh])
  const guardedSignOut = useCallback(async () => {
    const pending = await controller.pendingCount()
    if (pending && !confirm(`Hay ${pending} cambio${pending === 1 ? '' : 's'} sin sincronizar. Se conservarán en este dispositivo para esta cuenta. ¿Cerrar sesión de todos modos?`)) return
    await signOut()
  }, [controller, signOut])
  if (error) return <StateMessage title="No pudimos abrir tu espacio" body={`${error} Verifica que la migración de Supabase esté aplicada.`} action={() => location.reload()} actionLabel="Reintentar" />
  if (!data) return <LoadingScreen />
  return <Workspace data={data} actions={actions} syncState={syncState} isDemo={false} user={user} signOut={guardedSignOut} />
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Workspace } from './Workspace.jsx'
import { createRemoteActions, ensureRemoteWorkspace, loadRemoteWorkspace } from '../data/remoteRepository.js'
import { LoadingScreen, StateMessage } from '../shared/components/Feedback.jsx'

export function RemoteApp({ user, signOut }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => setData(await loadRemoteWorkspace()), [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await ensureRemoteWorkspace(user.id)
        const next = await loadRemoteWorkspace()
        if (active) setData(next)
      } catch (issue) {
        if (active) setError(issue.message || 'No pudimos cargar tus datos.')
      }
    })()
    return () => { active = false }
  }, [user.id])

  const actions = useMemo(() => createRemoteActions(user.id, refresh), [user.id, refresh])
  if (error) return <StateMessage title="No pudimos abrir tu espacio" body={`${error} Verifica que la migración de Supabase esté aplicada.`} action={() => location.reload()} actionLabel="Reintentar" />
  if (!data) return <LoadingScreen />
  return <Workspace data={data} actions={actions} isDemo={false} user={user} signOut={signOut} />
}

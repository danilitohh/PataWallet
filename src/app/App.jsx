import { useEffect, useState } from 'react'
import { seedDemo } from '../data/db.js'
import { LoadingScreen, StateMessage } from '../shared/components/Feedback.jsx'
import { DemoApp } from './DemoApp.jsx'

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    seedDemo()
      .then(() => setReady(true))
      .catch(() => setError('No pudimos abrir el almacenamiento local. Revisa los permisos del navegador y vuelve a intentar.'))
  }, [])

  if (error) return <StateMessage title="No pudimos abrir PataWallet" body={error} action={() => location.reload()} actionLabel="Reintentar" />
  if (!ready) return <LoadingScreen />
  return <DemoApp />
}

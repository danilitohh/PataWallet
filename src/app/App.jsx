import { useEffect, useState } from 'react'
import { seedDemo } from '../data/db.js'
import { LoadingScreen, StateMessage } from '../shared/components/Feedback.jsx'
import { DemoApp } from './DemoApp.jsx'
import { RemoteApp } from './RemoteApp.jsx'
import { AuthPage } from '../features/auth/AuthPage.jsx'
import { AuthProvider } from '../features/auth/AuthProvider.jsx'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { isSupabaseConfigured } from '../lib/supabase/client.js'
import { NightAmbience } from '../components/ambience/NightAmbience.jsx'

export function App() {
  // El fondo se comparte con acceso, onboarding y rutas sin duplicar animaciones.
  return <><NightAmbience />{isSupabaseConfigured ? <AuthProvider><AuthenticatedApp /></AuthProvider> : <LocalDemo />}</>
}

function AuthenticatedApp() {
  const { user, loading, signOut } = useAuth()
  if (loading) return <LoadingScreen />
  if (new URLSearchParams(location.search).has('recovery')) return <AuthPage />
  if (!user) return <AuthPage />
  return <RemoteApp user={user} signOut={signOut} />
}

function LocalDemo() {
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

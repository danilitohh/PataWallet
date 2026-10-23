import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { seedDemo } from '../data/db.js'
import { LoadingScreen, StateMessage } from '../shared/components/Feedback.jsx'
import { DemoApp } from './DemoApp.jsx'
import { RemoteApp } from './RemoteApp.jsx'
import { AuthPage } from '../features/auth/AuthPage.jsx'
import { AuthProvider } from '../features/auth/AuthProvider.jsx'
import { useAuth } from '../features/auth/AuthContext.jsx'
import { isSupabaseConfigured } from '../lib/supabase/client.js'
import { NightAmbience } from '../components/ambience/NightAmbience.jsx'
import { PublicDocumentPage, PublicHomePage } from '../features/public/PublicPages.jsx'
import { PwaUpdatePrompt } from '../features/pwa/PwaUpdatePrompt.jsx'

export function App() {
  const location = useLocation()
  if (location.pathname === '/privacidad') return <PublicDocumentPage type="privacy" />
  if (location.pathname === '/terminos') return <PublicDocumentPage type="terms" />
  // El fondo se comparte con acceso, onboarding y rutas sin duplicar animaciones.
  return <><NightAmbience />{isSupabaseConfigured ? <AuthProvider><AuthenticatedApp /></AuthProvider> : <LocalDemo />}</>
}

function AuthenticatedApp() {
  const location = useLocation()
  const { user, loading, signOut, signupSetupIssue, dismissSignupSetupIssue } = useAuth()
  // El registro debe ocurrir también durante el primer onboarding. Si se monta
  // solo dentro de Workspace, la activación de avisos intenta usar
  // navigator.serviceWorker.ready antes de que exista una registration.
  const content = loading
    ? <LoadingScreen />
    : user && signupSetupIssue
      ? <StateMessage title="Cuenta lista, preferencias pendientes" body={signupSetupIssue} action={dismissSignupSetupIssue} actionLabel="Continuar sin preferencias" />
      : renderAuthenticatedContent(location, user, signOut)
  return <><PwaUpdatePrompt />{content}</>
}

function renderAuthenticatedContent(location, user, signOut) {
  const params = new URLSearchParams(location.search)
  if (params.has('recovery')) return <AuthPage />
  if (!user && location.pathname === '/' && !params.has('acceso')) return <PublicHomePage />
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

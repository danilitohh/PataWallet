import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase/client.js'
import { AuthContext } from './AuthContext.jsx'
import { observeAuth } from './observeAuth.js'
import { normalizeSignupSetup } from '../../domain/registration.js'

const signupDraftKey = 'patawallet:signup-setup:v1'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [observedUser, setObservedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signupSetupIssue, setSignupSetupIssue] = useState('')
  const setupPromise = useRef(null)

  useEffect(() => {
    // Unifica la carga inicial y los eventos para evitar volver al acceso tras Google.
    return observeAuth(supabase.auth, setObservedUser)
  }, [])

  useEffect(() => {
    let active = true
    const prepareUser = async () => {
      if (!observedUser) {
        setupPromise.current = null
        setUser(null)
        setSignupSetupIssue('')
        setLoading(false)
        return
      }

      let draft
      try { draft = JSON.parse(sessionStorage.getItem(signupDraftKey) || 'null') } catch { draft = null }
      const setup = normalizeSignupSetup(draft?.setup)
      const name = typeof draft?.name === 'string' ? draft.name.trim().slice(0, 80) : ''
      if (!setup || name.length < 2) {
        if (draft) {
          try { sessionStorage.removeItem(signupDraftKey) } catch { /* Se ignora el borrador incompleto y se abre la cuenta. */ }
        }
        setUser(observedUser)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        let task = setupPromise.current
        if (!task || task.userId !== observedUser.id) {
          const request = supabase.auth.updateUser({ data: { ...observedUser.user_metadata, display_name: name, full_name: name, patawallet_onboarding_v1: setup } })
            .then(({ data, error }) => {
              if (error) throw error
              return data.user
            })
          task = { userId: observedUser.id, request }
          setupPromise.current = task
        }
        const configuredUser = await task.request
        try { sessionStorage.removeItem(signupDraftKey) } catch { /* La configuración quedó en metadata aunque el borrador permanezca. */ }
        setSignupSetupIssue('')
        if (active) setUser(configuredUser || observedUser)
      } catch {
        setSignupSetupIssue('Tu cuenta de Google ya está activa, pero no pudimos guardar las preferencias de este registro. Puedes continuar y ajustar la portada en Ajustes.')
        if (active) setUser(observedUser)
      } finally {
        if (active) setLoading(false)
      }
    }

    void prepareUser()
    return () => { active = false }
  }, [observedUser])

  const dismissSignupSetupIssue = () => {
    try { sessionStorage.removeItem(signupDraftKey) } catch { /* No afecta el inicio de sesión. */ }
    setSignupSetupIssue('')
  }
  const value = useMemo(() => ({ user, loading, signupSetupIssue, dismissSignupSetupIssue, signOut: () => supabase.auth.signOut() }), [user, loading, signupSetupIssue])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase/client.js'
import { AuthContext } from './AuthContext.jsx'
import { observeAuth } from './observeAuth.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Unifica la carga inicial y los eventos para evitar volver al acceso tras Google.
    return observeAuth(supabase.auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const value = useMemo(() => ({ user, loading, signOut: () => supabase.auth.signOut() }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

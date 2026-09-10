import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase/client.js'
import { AuthContext } from './AuthContext.jsx'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null)
        setLoading(false)
      }
    }).catch(() => active && setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo(() => ({ user, loading, signOut: () => supabase.auth.signOut() }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

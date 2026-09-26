// Mantiene el último evento de Auth por encima de una consulta inicial que termine tarde.
export function observeAuth(auth, onUser) {
  let active = true
  let changed = false

  // La consulta inicial valida la sesión guardada, pero no puede revertir un acceso posterior.
  void auth.getUser().then(({ data }) => {
    if (active && !changed) onUser(data.user ?? null)
  }).catch(() => {
    if (active && !changed) onUser(null)
  })

  // INITIAL_SESSION es solo una copia local; SIGNED_IN y SIGNED_OUT son cambios nuevos.
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (!active || event === 'INITIAL_SESSION') return
    if (event !== 'SIGNED_OUT' && !session?.user) return
    changed = true
    onUser(session?.user ?? null)
  })

  return () => { active = false; subscription.unsubscribe() }
}

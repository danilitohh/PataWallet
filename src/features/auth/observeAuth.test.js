import { describe, expect, it } from 'vitest'
import { observeAuth } from './observeAuth.js'

// Simula respuestas de red pendientes y eventos de Auth en cualquier orden.
function pendingAuth() {
  let resolveUser
  let rejectUser
  let emit
  let unsubscribed = false
  const auth = {
    getUser: () => new Promise((resolve, reject) => { resolveUser = resolve; rejectUser = reject }),
    onAuthStateChange: (callback) => {
      emit = callback
      return { data: { subscription: { unsubscribe: () => { unsubscribed = true } } } }
    },
  }
  return { auth, resolve: (user) => resolveUser({ data: { user } }), reject: (error) => rejectUser(error), emit: (event, user) => emit(event, user ? { user } : null), wasUnsubscribed: () => unsubscribed }
}

describe('observación de sesión', () => {
  it('no deja que una respuesta inicial vacía deshaga el acceso de Google', async () => {
    const source = pendingAuth()
    const users = []
    const stop = observeAuth(source.auth, (user) => users.push(user?.id ?? null))
    source.emit('INITIAL_SESSION', null)
    source.emit('SIGNED_IN', { id: 'google' })
    source.resolve(null)
    await Promise.resolve()

    expect(users).toEqual(['google'])
    stop()
    expect(source.wasUnsubscribed()).toBe(true)
  })

  it('no restaura un usuario antiguo después de cerrar sesión', async () => {
    const source = pendingAuth()
    const users = []
    observeAuth(source.auth, (user) => users.push(user?.id ?? null))
    source.emit('SIGNED_OUT', null)
    source.resolve({ id: 'anterior' })
    await Promise.resolve()

    expect(users).toEqual([null])
  })

  it('no muestra el acceso si falla una validación anterior al retorno de Google', async () => {
    const source = pendingAuth()
    const users = []
    observeAuth(source.auth, (user) => users.push(user?.id ?? null))
    source.emit('SIGNED_IN', { id: 'google' })
    source.reject(new Error('Sin conexión'))
    await Promise.resolve()
    await Promise.resolve()

    expect(users).toEqual(['google'])
  })

  it('carga la sesión inicial validada si no hubo eventos nuevos', async () => {
    const source = pendingAuth()
    const users = []
    observeAuth(source.auth, (user) => users.push(user?.id ?? null))
    source.emit('INITIAL_SESSION', { id: 'guardado' })
    source.resolve({ id: 'validado' })
    await Promise.resolve()

    expect(users).toEqual(['validado'])
  })
})

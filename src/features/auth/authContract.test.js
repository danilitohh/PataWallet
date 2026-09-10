import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = fs.readFileSync(new URL('./AuthPage.jsx', import.meta.url), 'utf8')
const provider = fs.readFileSync(new URL('./AuthProvider.jsx', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../../lib/supabase/client.js', import.meta.url), 'utf8')

describe('contrato de autenticación Supabase', () => {
  it('mantiene los flujos administrados por el proveedor', () => {
    expect(page).toContain('supabase.auth.signUp')
    expect(page).toContain('supabase.auth.signInWithPassword')
    expect(page).toContain("provider: 'google'")
    expect(page).toContain('supabase.auth.resetPasswordForEmail')
    expect(page).toContain('supabase.auth.updateUser')
    expect(provider).toContain('supabase.auth.signOut')
  })

  it('persiste, renueva y detecta la sesión devuelta por OAuth o correo', () => {
    expect(client).toContain('persistSession: true')
    expect(client).toContain('autoRefreshToken: true')
    expect(client).toContain('detectSessionInUrl: true')
    expect(provider).toContain('supabase.auth.onAuthStateChange')
  })
})

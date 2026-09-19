import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LogIn, PawPrint } from 'lucide-react'
import { PetScene } from '../../components/PetScene.jsx'
import { NightScene } from '../../components/NightScene.jsx'
import { supabase } from '../../lib/supabase/client.js'

const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true'

const messages = {
  'Invalid login credentials': 'El correo o la contraseña no coinciden.',
  'Email not confirmed': 'Confirma tu correo antes de iniciar sesión.',
  'User already registered': 'Ya existe una cuenta con este correo.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 8 caracteres.',
}

function friendlyError(error) {
  return messages[error?.message] || error?.message || 'No pudimos completar la solicitud. Intenta de nuevo.'
}

// Presenta acceso, registro y recuperación reales con la misma identidad nocturna.
export function AuthPage() {
  const recovery = new URLSearchParams(location.search).has('recovery')
  const [mode, setMode] = useState(recovery ? 'update' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const run = async (callback) => {
    setBusy(true); setError(''); setNotice('')
    try { await callback() } catch (issue) { setError(friendlyError(issue)) } finally { setBusy(false) }
  }

  const submit = (event) => {
    event.preventDefault()
    run(async () => {
      if (mode === 'forgot') {
        const { error: issue } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/?recovery=1` })
        if (issue) throw issue
        setNotice('Te enviamos un enlace para crear una contraseña nueva.')
        return
      }
      if (mode === 'update') {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
        const { error: issue } = await supabase.auth.updateUser({ password })
        if (issue) throw issue
        history.replaceState({}, '', '/')
        setNotice('Contraseña actualizada. Ya puedes continuar.')
        return
      }
      if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
      if (mode === 'register') {
        if (name.trim().length < 2) throw new Error('Escribe tu nombre.')
        const { data, error: issue } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim(), full_name: name.trim() }, emailRedirectTo: location.origin } })
        if (issue) throw issue
        if (!data.session) setNotice('Cuenta creada. Revisa tu correo para confirmar el registro.')
      } else {
        const { error: issue } = await supabase.auth.signInWithPassword({ email, password })
        if (issue) throw issue
      }
    })
  }

  const google = () => run(async () => {
    const { error: issue } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })
    if (issue) throw issue
  })

  const changeMode = (next) => { setMode(next); setError(''); setNotice(''); setPassword('') }
  const title = mode === 'register' ? 'Crea tu cuenta' : mode === 'forgot' ? 'Recupera tu acceso' : mode === 'update' ? 'Nueva contraseña' : 'Qué bueno verte'

  return (
    <main className="auth-layout">
      <section className="auth-art" aria-label="Bienvenida a PataWallet">
        <div className="wordmark"><PawPrint /> PataWallet</div>
        <div><p className="eyebrow">Tu hogar financiero</p><h1>Tu dinero,<br />tu paz, tu manada.</h1><p>Buenas finanzas. Más espacio para lo que quieres.</p></div>
        <PetScene name="welcome" />
        <NightScene hero />
      </section>
      <section className="auth-panel">
        <div className="wordmark auth-mobile-brand"><PawPrint /> PataWallet</div>
        <div className="auth-card">
          {(mode === 'forgot' || mode === 'update') && <button className="auth-back" type="button" onClick={() => changeMode('login')}><ArrowLeft /> Volver</button>}
          <p className="eyebrow">{mode === 'register' ? 'Registro' : 'Acceso seguro'}</p>
          <h2>{title}</h2>
          <p>{mode === 'register' ? 'Empieza con un espacio financiero privado.' : mode === 'forgot' ? 'Te enviaremos un enlace seguro a tu correo.' : mode === 'update' ? 'Elige una contraseña que no uses en otros sitios.' : 'Inicia sesión para ver únicamente tus datos.'}</p>
          {googleEnabled && mode !== 'forgot' && mode !== 'update' && <><button className="button auth-google" type="button" onClick={google} disabled={busy}><span className="google-mark" aria-hidden="true">G</span> Continuar con Google</button><div className="auth-divider"><span>o con correo</span></div></>}
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label>Nombre<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
            {mode !== 'update' && <label>Correo<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
            {mode !== 'forgot' && <label>Contraseña<div className="password-field"><input type={visible ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff /> : <Eye />}</button></div></label>}
            {error && <p className="form-error" role="alert">{error}</p>}
            {notice && <p className="form-notice" role="status">{notice}</p>}
            <button className="button button--primary button--wide" disabled={busy} type="submit"><LogIn /> {busy ? 'Un momento…' : mode === 'register' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : mode === 'update' ? 'Guardar contraseña' : 'Iniciar sesión'}</button>
          </form>
          {mode === 'login' && <button className="auth-link" type="button" onClick={() => changeMode('forgot')}>Olvidé mi contraseña</button>}
          {mode === 'login' && <p className="auth-switch">¿Primera vez aquí? <button type="button" onClick={() => changeMode('register')}>Crear una cuenta</button></p>}
          {mode === 'register' && <p className="auth-switch">¿Ya tienes cuenta? <button type="button" onClick={() => changeMode('login')}>Iniciar sesión</button></p>}
        </div>
        <NightScene className="auth-mobile-scene" />
      </section>
    </main>
  )
}

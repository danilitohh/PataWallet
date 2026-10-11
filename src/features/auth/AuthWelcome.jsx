import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Eye, EyeOff, LogIn, PawPrint } from 'lucide-react'

export function AuthWelcome({
  mode = 'welcome', onCreateAccount, onLogin, onBackToWelcome, onForgotPassword,
  onGoogle, googleEnabled, email, onEmailChange, password, onPasswordChange,
  visible, onTogglePassword, onSubmit, busy, error, notice,
}) {
  const reduceMotion = useReducedMotion()
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden')
  const showAnimation = reduceMotion === false && documentVisible && document.documentElement.dataset.motion !== 'off'
  const showAccessForm = mode === 'login' || mode === 'forgot'

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  return (
    <main className={`auth-welcome ${showAccessForm ? 'auth-welcome--access' : ''}`}>
      <header className="auth-welcome__header">
        <div className="auth-welcome__brand"><PawPrint aria-hidden="true" /><span>PataWallet</span></div>
        {showAccessForm
          ? <button className="auth-welcome__header-action" type="button" onClick={mode === 'login' ? onBackToWelcome : onLogin}>{mode === 'login' ? 'Inicio' : 'Volver al acceso'}</button>
          : <span className="auth-welcome__tag">Tu espacio financiero</span>}
      </header>

      <section className="auth-welcome__hero" aria-labelledby="auth-welcome-title">
        <div className="auth-welcome__copy">
          <p className="auth-welcome__eyebrow">Finanzas con compañía</p>
          <h1 id="auth-welcome-title">Tus finanzas,<br />en buenas patas.</h1>
          <p className="auth-welcome__description">Un espacio claro para tus gastos, tus metas y los planes que quieres cuidar.</p>
        </div>

        <div className="auth-welcome__art">
          <div className="auth-welcome__shadow" />
          <motion.div
            className="auth-welcome__animation"
            initial={showAnimation ? { opacity: 0, y: 24, scale: .96 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: showAnimation ? .55 : 0, ease: 'easeOut' }}
          >
            {showAnimation ? <picture>
              <source srcSet="/assets/illustrations/welcome-pets-chroma.webp" type="image/webp" />
              <img className="auth-welcome__media" src="/assets/illustrations/welcome-pets-poster.png" alt="Gatos y cachorros jugando alrededor de una huella de PataWallet" width="480" height="232" fetchPriority="high" />
            </picture> : <img className="auth-welcome__media" src="/assets/illustrations/welcome-pets-poster.png" alt="Gatos y cachorros jugando alrededor de una huella de PataWallet" width="480" height="232" fetchPriority="high" />}
          </motion.div>
        </div>

        <div className={`auth-welcome__actions ${showAccessForm ? 'auth-welcome__actions--access' : ''}`}>
          {!showAccessForm ? <>
            <button className="button auth-welcome__create" type="button" onClick={onCreateAccount}>
              Crear cuenta <ArrowRight aria-hidden="true" />
            </button>
            <button className="button auth-welcome__login" type="button" onClick={onLogin}>
              Ya tengo cuenta
            </button>
            <p className="auth-welcome__note"><PawPrint aria-hidden="true" /> Privada, sencilla y hecha para ti.</p>
          </> : <motion.section
            key={mode}
            className="auth-welcome__account-panel"
            aria-labelledby="auth-account-title"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : .24, ease: 'easeOut' }}
          >
            <div className="auth-welcome__account-copy">
              <p className="auth-welcome__eyebrow">Acceso seguro</p>
              <h2 id="auth-account-title">{mode === 'forgot' ? 'Recupera tu acceso' : 'Qué bueno verte'}</h2>
              <p>{mode === 'forgot' ? 'Te enviaremos un enlace seguro a tu correo.' : 'Inicia sesión para ver únicamente tus datos.'}</p>
            </div>
            {mode === 'login' && googleEnabled && <>
              <button className="button auth-welcome__google" type="button" onClick={onGoogle} disabled={busy}>
                <span className="google-mark" aria-hidden="true">G</span> Continuar con Google
              </button>
              <div className="auth-welcome__divider"><span>o con correo</span></div>
            </>}
            <form className="auth-welcome__form" onSubmit={onSubmit}>
              <label>Correo<input type="email" autoComplete="email" value={email} onChange={onEmailChange} required /></label>
              {mode === 'login' && <label>Contraseña<div className="auth-welcome__password">
                <input type={visible ? 'text' : 'password'} autoComplete="current-password" minLength="8" value={password} onChange={onPasswordChange} required />
                <button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={onTogglePassword}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
              </div></label>}
              {error && <p className="form-error" role="alert">{error}</p>}
              {notice && <p className="form-notice" role="status">{notice}</p>}
              <button className="button auth-welcome__submit" disabled={busy} type="submit">
                {mode === 'login' && <LogIn aria-hidden="true" />}
                {busy ? 'Un momento…' : mode === 'forgot' ? 'Enviar enlace' : 'Iniciar sesión'}
              </button>
            </form>
            {mode === 'login' ? <>
              <button className="auth-welcome__text-button" type="button" onClick={onForgotPassword}>Olvidé mi contraseña</button>
              <p className="auth-welcome__switch">¿Primera vez aquí? <button type="button" onClick={onCreateAccount}>Crear una cuenta</button></p>
            </> : null}
          </motion.section>}
        </div>
      </section>
    </main>
  )
}

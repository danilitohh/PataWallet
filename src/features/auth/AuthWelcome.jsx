import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, PawPrint } from 'lucide-react'

export function AuthWelcome({ onCreateAccount, onLogin }) {
  const reduceMotion = useReducedMotion()
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden')
  const showAnimation = reduceMotion === false && documentVisible && document.documentElement.dataset.motion !== 'off'

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  return (
    <main className="auth-welcome">
      <header className="auth-welcome__header">
        <div className="auth-welcome__brand"><PawPrint aria-hidden="true" /><span>PataWallet</span></div>
        <span className="auth-welcome__tag">Tu espacio financiero</span>
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
              <img className="auth-welcome__media" src="/assets/illustrations/welcome-pets-poster.png" alt="Gatos y cachorros jugando alrededor de una huella de PataWallet" width="480" height="233" fetchPriority="high" />
            </picture> : <img className="auth-welcome__media" src="/assets/illustrations/welcome-pets-poster.png" alt="Gatos y cachorros jugando alrededor de una huella de PataWallet" width="480" height="233" fetchPriority="high" />}
          </motion.div>
        </div>

        <div className="auth-welcome__actions">
          <button className="button auth-welcome__create" type="button" onClick={onCreateAccount}>
            Crear cuenta <ArrowRight aria-hidden="true" />
          </button>
          <button className="button auth-welcome__login" type="button" onClick={onLogin}>
            Ya tengo cuenta
          </button>
          <p className="auth-welcome__note"><PawPrint aria-hidden="true" /> Privada, sencilla y hecha para ti.</p>
        </div>
      </section>
    </main>
  )
}

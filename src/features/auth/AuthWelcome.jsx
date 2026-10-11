import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, PawPrint } from 'lucide-react'
import { WALLET_CARDS } from '../onboarding/walletCardModel.js'

export function AuthWelcome({ onCreateAccount, onLogin }) {
  const reduceMotion = useReducedMotion()
  const card = WALLET_CARDS[0]

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

        <div className="auth-welcome__art" aria-label="Portada de PataWallet con dos guacamayas">
          <div className="auth-welcome__shadow" />
          <motion.img
            src={card.image}
            alt={card.alt}
            width="640"
            height="800"
            fetchPriority="high"
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : .55, ease: 'easeOut' }}
          />
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

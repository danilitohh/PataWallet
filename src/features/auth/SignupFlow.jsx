import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, CarFront, Check, ChevronLeft, ChevronRight,
  Circle, CircleDollarSign, CreditCard, ExternalLink, HeartPulse, House, LockKeyhole, Mail,
  PawPrint, Play, ShoppingBasket, Sparkles, Utensils, Eye, EyeOff, Zap,
} from 'lucide-react'
import { formatInputAmount, parseLocalizedAmount } from '../../domain/money.js'
import { STARTER_CATEGORIES, DEFAULT_STARTER_CATEGORY_IDS, normalizeIntegrationSetup } from '../../domain/registration.js'
import { currentMonth } from '../../shared/lib/date.js'
import { WALLET_CARDS } from '../onboarding/walletCardModel.js'
import shortcutManifest from '../../../shortcuts/template-manifest.json'

const stepLabels = ['Nombre', 'Portada', 'Moneda', 'Presupuesto', 'Atajos', 'Cuenta']
const categoryIcons = {
  briefcase: BriefcaseBusiness,
  basket: ShoppingBasket,
  car: CarFront,
  paw: PawPrint,
  utensils: Utensils,
  house: House,
  heart: HeartPulse,
  bolt: Zap,
  sparkles: Sparkles,
  circle: Circle,
}

function signupValues(categories, cardStyle, budgetAmount) {
  return {
    version: 1,
    cardStyle,
    currency: 'COP',
    categories,
    monthlyBudgetMinor: budgetAmount.trim() ? parseLocalizedAmount(budgetAmount) : null,
    budgetMonth: currentMonth(),
  }
}

export function SignupFlow({ onLogin, onCreateAccount, onGoogle, googleEnabled, busy, error, notice }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)
  const [categories, setCategories] = useState(DEFAULT_STARTER_CATEGORY_IDS)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [integrationSetup, setIntegrationSetup] = useState({ shortcut: false, bankEmail: false, notifications: false })
  const [stepError, setStepError] = useState('')
  const [direction, setDirection] = useState(1)
  const reduceMotion = useReducedMotion()
  const swipeStartX = useRef(null)
  const card = WALLET_CARDS[cardIndex]

  const moveCard = (offset) => setCardIndex((value) => (value + offset + WALLET_CARDS.length) % WALLET_CARDS.length)
  const toggleCategory = (id) => {
    setCategories((selected) => selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
    setStepError('')
  }

  const go = (next) => {
    setDirection(next > step ? 1 : -1)
    setStepError('')
    setStep(next)
  }

  const continueFlow = () => {
    setStepError('')
    try {
      if (step === 0 && name.trim().length < 2) throw new Error('Escribe tu nombre para continuar.')
      if (step === 3) {
        if (categories.length < 1) throw new Error('Elige al menos una categoría para empezar.')
        if (budgetAmount.trim()) parseLocalizedAmount(budgetAmount)
      }
      go(Math.min(step + 1, stepLabels.length - 1))
    } catch (issue) {
      setStepError(issue.message)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    setStepError('')
    try {
      const setup = signupValues(categories, card.id, budgetAmount)
      onCreateAccount({ name: name.trim(), email: email.trim(), password, setup, integrations: normalizeIntegrationSetup(integrationSetup) })
    } catch (issue) {
      setStepError(issue.message)
    }
  }

  const startGoogle = () => {
    try {
      onGoogle(signupValues(categories, card.id, budgetAmount), name.trim(), normalizeIntegrationSetup(integrationSetup))
    } catch (issue) {
      setStepError(issue.message)
    }
  }

  const stagePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    swipeStartX.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const stagePointerUp = (event) => {
    if (swipeStartX.current === null) return
    const delta = event.clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(delta) > 42) moveCard(delta < 0 ? 1 : -1)
  }
  const keyCard = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      moveCard(event.key === 'ArrowRight' ? 1 : -1)
    }
  }

  const renderStep = () => {
    if (step === 0) return <>
      <p className="signup-flow__eyebrow">Primero, un saludo</p>
      <h1>¿Cómo te llamamos?</h1>
      <p className="signup-flow__lede">Usaremos tu nombre para personalizar tu espacio.</p>
      <label className="signup-flow__field"><span>Tu nombre</span><input autoComplete="name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Por ejemplo, Danilo" maxLength={80} /></label>
      <p className="signup-flow__fine">Solo se muestra dentro de tu cuenta.</p>
    </>

    if (step === 1) return <>
      <p className="signup-flow__eyebrow">Tu billetera, a tu manera</p>
      <h1>Elige una portada</h1>
      <p className="signup-flow__lede">Desliza para ver los diseños. Puedes cambiarla después.</p>
      <div className="signup-flow__carousel" data-card-style={card.id}>
        <button className="signup-flow__arrow" type="button" onClick={() => moveCard(-1)} aria-label="Portada anterior"><ChevronLeft aria-hidden="true" /></button>
        <div className="signup-flow__card-stage" role="group" aria-roledescription="diapositiva" aria-label={`${card.name}, ${cardIndex + 1} de ${WALLET_CARDS.length}`} tabIndex={0} onPointerDown={stagePointerDown} onPointerUp={stagePointerUp} onPointerCancel={() => { swipeStartX.current = null }} onKeyDown={keyCard}>
          {WALLET_CARDS.map((item, index) => {
            const distance = ((index - cardIndex + WALLET_CARDS.length + 2) % WALLET_CARDS.length) - 2
            const position = distance === 0 ? 'active' : distance === 1 || distance === -4 ? 'right' : distance === -1 || distance === 4 ? 'left' : 'back'
            return <img key={item.id} className={`signup-flow__card signup-flow__card--${position}`} src={item.image} alt={distance === 0 ? item.alt : ''} aria-hidden={distance !== 0} draggable="false" width="640" height="800" />
          })}
        </div>
        <button className="signup-flow__arrow" type="button" onClick={() => moveCard(1)} aria-label="Portada siguiente"><ChevronRight aria-hidden="true" /></button>
      </div>
      <div className="signup-flow__card-caption" aria-live="polite"><strong>{card.name}</strong><span>{card.description}</span><small>{cardIndex + 1} / {WALLET_CARDS.length}</small></div>
      <p className="signup-flow__fine">La portada es visual; no representa una tarjeta bancaria.</p>
    </>

    if (step === 2) return <>
      <p className="signup-flow__eyebrow">Una base clara</p>
      <h1>Tu moneda</h1>
      <p className="signup-flow__lede">Así verás los saldos y movimientos en toda la app.</p>
      <div className="signup-flow__currency" aria-label="Moneda disponible">
        <span className="signup-flow__currency-icon"><CircleDollarSign aria-hidden="true" /></span>
        <span><strong>Peso colombiano</strong><small>COP · Colombia</small></span>
        <span className="signup-flow__currency-check"><Check aria-hidden="true" /></span>
      </div>
      <p className="signup-flow__fine">PataWallet guarda los importes en pesos colombianos (COP).</p>
    </>

    if (step === 3) return <>
      <p className="signup-flow__eyebrow">Un comienzo útil</p>
      <h1>Arma tu presupuesto</h1>
      <p className="signup-flow__lede">Elige categorías para tenerlas listas y, si quieres, define un límite total del mes.</p>
      <div className="signup-flow__category-grid" aria-label="Categorías iniciales">
        {STARTER_CATEGORIES.map((item) => {
          const Icon = categoryIcons[item.icon] || Circle
          const checked = categories.includes(item.id)
          return <button key={item.id} className={`signup-flow__category${checked ? ' is-selected' : ''}`} type="button" aria-pressed={checked} onClick={() => toggleCategory(item.id)}>
            <span className="signup-flow__category-icon"><Icon aria-hidden="true" /></span><span>{item.name}</span>{checked && <Check className="signup-flow__category-check" aria-hidden="true" />}
          </button>
        })}
      </div>
      <label className="signup-flow__field signup-flow__budget-field"><span>Límite total mensual <small>Opcional</small></span><div className="signup-flow__amount"><span>$</span><input inputMode="decimal" autoComplete="off" value={budgetAmount} onChange={(event) => setBudgetAmount(formatInputAmount(event.target.value))} placeholder="1.500.000" aria-label="Límite total mensual en pesos colombianos" /></div></label>
      <p className="signup-flow__fine">Es un límite general para gastos del mes, no por categoría. Puedes crear presupuestos más detallados después.</p>
    </>

    if (step === 4) return <>
      <p className="signup-flow__eyebrow">Conecta solo lo que quieras</p>
      <h1>Deja todo a tu ritmo</h1>
      <p className="signup-flow__lede">Puedes instalar el atajo ahora. El correo y las notificaciones se conectan después de crear tu cuenta.</p>
      <div className="signup-flow__integrations">
        <article className="signup-flow__integration-card">
          <div className="signup-flow__integration-heading"><span className="signup-flow__shortcut-icon"><CreditCard aria-hidden="true" /></span><div><strong>Pagos con tarjeta</strong><p>Instala el atajo oficial; al entrar podrás vincularlo y elegir el video guía.</p></div></div>
          <div className="signup-flow__integration-actions">
            <a className="button button--secondary" href={shortcutManifest.shortcutIcloudUrl} target="_blank" rel="noreferrer" onClick={() => setIntegrationSetup((current) => ({ ...current, shortcut: true }))}><ExternalLink aria-hidden="true" /> Añadir atajo</a>
            <a className="signup-flow__video-link" href="/assets/integrations/tutorial-patawallet-paso-a-paso.mp4" target="_blank" rel="noopener noreferrer" onClick={() => setIntegrationSetup((current) => ({ ...current, shortcut: true }))}><Play aria-hidden="true" /> Ver video <ExternalLink aria-hidden="true" /></a>
          </div>
          <label className="signup-flow__integration-choice"><input type="checkbox" checked={integrationSetup.shortcut} onChange={(event) => setIntegrationSetup((current) => ({ ...current, shortcut: event.target.checked }))} /><span>Muéstrame cómo vincularlo al entrar</span></label>
        </article>

        <article className="signup-flow__integration-card">
          <div className="signup-flow__integration-heading"><span className="signup-flow__shortcut-icon"><Mail aria-hidden="true" /></span><div><strong>Transferencias por correo</strong><p>Conectarás Gmail u Outlook y elegirás los bancos. Nunca pediremos tu contraseña de correo.</p></div></div>
          <label className="signup-flow__integration-choice"><input type="checkbox" checked={integrationSetup.bankEmail} onChange={(event) => setIntegrationSetup((current) => ({ ...current, bankEmail: event.target.checked }))} /><span>Quiero conectar mi correo después de crear la cuenta</span></label>
        </article>

        <article className="signup-flow__integration-card">
          <div className="signup-flow__integration-heading"><span className="signup-flow__shortcut-icon"><Bell aria-hidden="true" /></span><div><strong>Notificaciones</strong><p>Actívalas desde el dispositivo. En iPhone, primero agrega PataWallet a Inicio.</p></div></div>
          <label className="signup-flow__integration-choice"><input type="checkbox" checked={integrationSetup.notifications} onChange={(event) => setIntegrationSetup((current) => ({ ...current, notifications: event.target.checked }))} /><span>Quiero activar avisos de PataWallet</span></label>
        </article>
      </div>
      <p className="signup-flow__fine">Tu selección solo prepara una guía al entrar; no instala ni activa nada por sí sola.</p>
    </>

    return <>
      <p className="signup-flow__eyebrow">Ya casi tienes tu espacio</p>
      <h1>Crea tu cuenta</h1>
      <p className="signup-flow__lede">{name.trim() ? `Un gusto, ${name.trim()}. ` : ''}Tus datos financieros quedan asociados a este acceso.</p>
      {googleEnabled && <><button className="button signup-flow__google" type="button" onClick={startGoogle} disabled={busy}><span className="signup-flow__google-mark" aria-hidden="true">G</span> Continuar con Google</button><div className="signup-flow__divider"><span>o con correo</span></div></>}
      <form className="signup-flow__form" onSubmit={submit}>
        <label className="signup-flow__field"><span>Correo electrónico</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="signup-flow__field"><span>Contraseña</span><div className="signup-flow__password"><LockKeyhole aria-hidden="true" /><input type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff /> : <Eye />}</button></div></label>
        <small className="signup-flow__fine">Usa al menos 8 caracteres. Te enviaremos un correo para confirmar tu cuenta.</small>
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <button className="button button--primary signup-flow__create" type="submit" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </form>
      <button className="signup-flow__login" type="button" onClick={onLogin}>¿Ya tienes cuenta? Inicia sesión</button>
    </>
  }

  const stepContent = renderStep()
  const isAccount = step === stepLabels.length - 1

  return (
    <main className="signup-flow" data-card-style={card.id}>
      <header className="signup-flow__header">
        <div className="signup-flow__brand"><PawPrint aria-hidden="true" /><strong>PataWallet</strong></div>
        <span className="signup-flow__step-count">{step + 1} <span>de</span> {stepLabels.length}</span>
      </header>
      <div className="signup-flow__progress" role="progressbar" aria-label="Progreso del registro" aria-valuemin={1} aria-valuemax={stepLabels.length} aria-valuenow={step + 1}><span style={{ transform: `scaleX(${(step + 1) / stepLabels.length})` }} /></div>

      <div className="signup-flow__viewport">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            className={`signup-flow__step signup-flow__step--${stepLabels[step].toLowerCase()}`}
            aria-label={`Paso ${step + 1}: ${stepLabels[step]}`}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 22 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: direction * -18 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <div className="signup-flow__content">
              {stepContent}
              {(error || stepError) && <p className="form-error" role="alert">{stepError || error}</p>}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className={`signup-flow__footer${isAccount ? ' signup-flow__footer--account' : ''}`}>
        {step > 0 && <button className="signup-flow__back" type="button" onClick={() => go(step - 1)} disabled={busy}><ArrowLeft aria-hidden="true" /> Atrás</button>}
        {!isAccount && <button className="button button--primary signup-flow__next" type="button" onClick={continueFlow}>
          {step === stepLabels.length - 2 ? 'Crear mi cuenta' : 'Continuar'} <ArrowRight aria-hidden="true" />
        </button>}
        {isAccount && <p className="signup-flow__terms">Usamos tu correo para iniciar sesión y confirmar el registro. Tus importes se guardan en COP.</p>}
      </footer>
    </main>
  )
}

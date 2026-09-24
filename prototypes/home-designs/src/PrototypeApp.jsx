import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Activity, Eye, EyeOff, Home, PawPrint, PiggyBank, Plus, WalletCards, X } from 'lucide-react'
import { Actividad } from './variants/Actividad.jsx'
import { Quincena } from './variants/Quincena.jsx'
import { Saldo } from './variants/Saldo.jsx'
import { DEMO, sumExpenses } from './data.js'

// Mantiene las direcciones en un arreglo para que picker, teclado y URL compartan el mismo orden.
const variants = [
  { label: 'Saldo claro', component: Saldo },
  { label: 'Quincena', component: Quincena },
  { label: 'Actividad', component: Actividad },
]

// Fija la referencia de gasto inicial para distinguir la demo de gastos agregados durante la exploración.
const demoBaselineSpentMinor = sumExpenses(DEMO.transactions)

// Mantiene un solo Inicio visible y sincroniza la opción elegida con el picker del prototipo.
export function PrototypeApp() {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, Math.min(variants.length - 1, (Number(new URLSearchParams(window.location.search).get('v')) || 1) - 1)))
  const [hidden, setHidden] = useState(false)
  const [transactions, setTransactions] = useState(DEMO.transactions)
  const [paidPayments, setPaidPayments] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const activeVariant = variants[activeIndex]
  const spentMinor = useMemo(() => sumExpenses(transactions), [transactions])
  const finances = useMemo(() => ({
    transactions,
    spentMinor,
    extraSpentMinor: Math.max(0, spentMinor - demoBaselineSpentMinor),
    availableMinor: DEMO.salaryMinor - DEMO.fixedMinor - DEMO.debtMinor - spentMinor,
    budgetRemainingMinor: DEMO.budgetMinor - spentMinor,
  }), [spentMinor, transactions])

  // Informa las acciones del marco que quedan fuera del alcance de estos bocetos de Inicio.
  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  // Actualiza los checkmarks del ejemplo sin escribir en la base de datos ni crear movimientos.
  const togglePayment = useCallback((paymentId) => {
    setPaidPayments((current) => current.includes(paymentId) ? current.filter((id) => id !== paymentId) : [...current, paymentId])
  }, [])

  // Añade un gasto solo en memoria para que el usuario vea cómo cambiarían los indicadores del Inicio.
  const addExpense = useCallback((event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const pesos = Number(formData.get('amount'))
    const amountMinor = Math.round(pesos * 100)
    if (!name || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      showToast('Revisa el nombre y el monto del gasto.')
      return
    }
    setTransactions((current) => [{ id: crypto.randomUUID(), name, category: 'Por clasificar', amountMinor, date: 'Ahora', tone: 'market' }, ...current])
    setDialogOpen(false)
    showToast('Gasto agregado a esta vista de ejemplo.')
  }, [showToast])

  // Cierra el formulario con Escape y libera temporizadores al desmontar la exploración.
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDialogOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      window.clearTimeout(toastTimer.current)
    }
  }, [])

  const changeSection = (label) => showToast(label === 'Inicio' ? 'Ya estás viendo Inicio.' : `La exploración está enfocada en Inicio; ${label} queda como referencia visual.`)

  return (
    <MotionConfig reducedMotion="user">
    <div className="prototype-canvas">
      <div className="prototype-app">
        <aside className="prototype-sidebar" aria-label="Vista de navegación de escritorio">
          <div className="prototype-brand"><span><PawPrint aria-hidden="true" /></span><b>PataWallet</b></div>
          <div className="prototype-sidebar__links">
            <SidebarItem icon={Home} label="Inicio" active onClick={() => changeSection('Inicio')} />
            <SidebarItem icon={Activity} label="Actividad" onClick={() => changeSection('Actividad')} />
            <SidebarItem icon={PiggyBank} label="Plan" onClick={() => changeSection('Plan')} />
            <SidebarItem icon={WalletCards} label="Cuentas" onClick={() => changeSection('Cuentas')} />
          </div>
          <p className="prototype-sidebar__note">Tus metas,<br />con mejor compañía.</p>
          <small>Exploración de diseño · local</small>
        </aside>

        <div className="prototype-main">
          <header className="prototype-topbar">
            <div className="prototype-brand prototype-brand--mobile"><span><PawPrint aria-hidden="true" /></span><b>PataWallet</b></div>
            <p>Un lugar tranquilo para tus cuentas.</p>
            <button type="button" className="privacy-button" onClick={() => setHidden((value) => !value)} aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} title={hidden ? 'Mostrar montos' : 'Ocultar montos'}>{hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
          </header>

          <main className="prototype-content">
            <div className="variant-stage" aria-live="polite">
              {(() => {
                const ActiveComponent = activeVariant.component
                return <ActiveComponent key={activeIndex} finances={finances} hidden={hidden} paidPayments={paidPayments} onTogglePayment={togglePayment} onNewExpense={() => setDialogOpen(true)} />
              })()}
            </div>
          </main>

          <nav className="prototype-dock" aria-label="Navegación de ejemplo">
            <DockItem icon={Home} label="Inicio" active onClick={() => changeSection('Inicio')} />
            <DockItem icon={Activity} label="Actividad" onClick={() => changeSection('Actividad')} />
            <button type="button" className="prototype-dock__add" aria-label="Nuevo movimiento" onClick={() => setDialogOpen(true)}><Plus aria-hidden="true" /></button>
            <DockItem icon={PiggyBank} label="Plan" onClick={() => changeSection('Plan')} />
            <DockItem icon={WalletCards} label="Cuentas" onClick={() => changeSection('Cuentas')} />
          </nav>
        </div>
      </div>

      <VariantPicker activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <AnimatePresence>{dialogOpen && <ExpenseDialog onClose={() => setDialogOpen(false)} onSubmit={addExpense} />}</AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="prototype-toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .18 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
    </MotionConfig>
  )
}

// Conserva el orden y nombres de secciones como contexto no financiero del prototipo.
function SidebarItem({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-sidebar__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Hace funcional cada acceso de la navegación de muestra y mantiene Inicio señalado.
function DockItem({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-dock__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Implementa el picker prescrito para comparar tres composiciones a tamaño real.
function VariantPicker({ activeIndex, setActiveIndex }) {
  const pickerRef = useRef(null)
  const itemRefs = useRef([])

  // Mueve el resaltado del picker al botón seleccionado, incluso tras cambiar el tamaño de ventana.
  const moveHighlight = useCallback(() => {
    const picker = pickerRef.current
    const highlight = picker?.querySelector('.proto-picker-highlight')
    const item = itemRefs.current[activeIndex]
    if (!highlight || !item) return
    highlight.style.width = `${item.offsetWidth}px`
    highlight.style.transform = `translateX(${item.offsetLeft}px)`
  }, [activeIndex])

  // Cambia la propuesta sin transición, guarda la elección en la URL y mantiene el foco actual.
  const selectVariant = useCallback((index) => {
    if (index < 0 || index >= variants.length) return
    setActiveIndex(index)
    const url = new URL(window.location.href)
    url.searchParams.set('v', String(index + 1))
    window.history.replaceState(null, '', url)
  }, [setActiveIndex])

  // Habilita el desplazamiento del picker tras el primer render para evitar una entrada animada.
  useLayoutEffect(() => {
    moveHighlight()
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', '')))
    return () => window.cancelAnimationFrame(frame)
  }, [moveHighlight])

  // Mantiene el picker usable con flechas y números sin interceptar teclas de campos.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= variants.length) selectVariant(number - 1)
      else if (event.key === 'ArrowRight') selectVariant((activeIndex + 1) % variants.length)
      else if (event.key === 'ArrowLeft') selectVariant((activeIndex - 1 + variants.length) % variants.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', moveHighlight)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', moveHighlight)
    }
  }, [activeIndex, moveHighlight, selectVariant])

  return (
    <nav className="proto-picker" aria-label="Diseños de inicio" data-position="top" ref={pickerRef}>
      <span className="proto-picker-highlight" aria-hidden="true"></span>
      {variants.map((variant, index) => <button key={variant.label} ref={(node) => { itemRefs.current[index] = node }} type="button" className="proto-picker-item" data-active={activeIndex === index ? '' : undefined} aria-current={activeIndex === index ? 'true' : undefined} onClick={() => selectVariant(index)}>{variant.label}</button>)}
    </nav>
  )
}

// Abre un formulario local y accesible para demostrar cómo se actualizan los números de cada propuesta.
function ExpenseDialog({ onClose, onSubmit }) {
  return <motion.div className="prototype-dialog-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <motion.section className="prototype-dialog" role="dialog" aria-modal="true" aria-labelledby="prototype-dialog-title" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .99 }} transition={{ duration: .2, ease: [0.16, 1, 0.3, 1] }}>
      <header><div><p className="dialog-kicker">SOLO EN ESTA EXPLORACIÓN</p><h2 id="prototype-dialog-title">Nuevo gasto</h2></div><button type="button" className="dialog-close" aria-label="Cerrar formulario" onClick={onClose}><X aria-hidden="true" /></button></header>
      <form onSubmit={onSubmit}>
        <label>¿En qué gastaste?<input name="name" required autoFocus maxLength="48" placeholder="Ej. Café con una amiga" /></label>
        <label>¿Cuánto pagaste?<span className="amount-field"><span>$</span><input name="amount" type="number" inputMode="numeric" min="1" step="1" required placeholder="25.000" /></span></label>
        <p>Este dato vive solo mientras la vista previa siga abierta. No cambia tu información de PataWallet.</p>
        <button type="submit" className="prototype-submit">Agregar a la vista</button>
      </form>
    </motion.section>
  </motion.div>
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Activity, Eye, EyeOff, Home, PawPrint, PiggyBank, Plus, WalletCards } from 'lucide-react'
import { INITIAL_ACCOUNTS, INITIAL_INCOME, INITIAL_PAYMENTS, summarizeAccounts } from './data.js'
import { AccountDialog } from './components/AccountComponents.jsx'
import { SaldoPrimero } from './variants/SaldoPrimero.jsx'
import { Bovedas } from './variants/Bovedas.jsx'
import { RegistroTranquilo } from './variants/RegistroTranquilo.jsx'

// Conserva tres propuestas distintas en el mismo orden para selector, teclado y URL.
const variants = [
  { label: 'Saldo primero', component: SaldoPrimero },
  { label: 'Bóvedas', component: Bovedas },
  { label: 'Registro tranquilo', component: RegistroTranquilo },
]

// Monta la demostración de Cuentas con estado temporal, sin conectarse a los datos del producto.
export function AccountsPrototypeApp() {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, Math.min(variants.length - 1, (Number(new URLSearchParams(window.location.search).get('v')) || 1) - 1)))
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS)
  const [income, setIncome] = useState(INITIAL_INCOME)
  const [payments, setPayments] = useState(INITIAL_PAYMENTS)
  const [hidden, setHidden] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState('')
  const [undo, setUndo] = useState(null)
  const [replayKey, setReplayKey] = useState(0)
  const toastTimer = useRef(null)
  const summary = useMemo(() => summarizeAccounts(accounts), [accounts])
  const activeVariant = variants[activeIndex]

  // Publica una notificación local y opcionalmente deja restaurar una cuenta archivada.
  const showToast = useCallback((message, undoAction = null) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    setUndo(() => undoAction)
    toastTimer.current = window.setTimeout(() => { setToast(''); setUndo(null) }, 3200)
  }, [])

  // Guarda formularios de muestra en memoria con importes enteros y un tipo explícito.
  const saveItem = useCallback((event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const amount = Number(formData.get('amount'))
    if (!name || !Number.isSafeInteger(amount) || amount <= 0) {
      showToast('Revisa el nombre y escribe un monto mayor que cero.')
      return
    }
    const { kind, item } = dialog
    if (kind === 'account') {
      const next = { id: item?.id || crypto.randomUUID(), name, amount, type: String(formData.get('type') || 'asset'), note: item?.note || (formData.get('type') === 'liability' ? 'Deuda pendiente' : 'Saldo disponible'), icon: item?.icon || (formData.get('type') === 'liability' ? 'card' : 'bank') }
      setAccounts((current) => item ? current.map((entry) => entry.id === item.id ? next : entry) : [...current, next])
    } else if (kind === 'income') {
      const next = { id: item?.id || crypto.randomUUID(), name, amount, frequency: String(formData.get('frequency')), next: item?.next || 'Según tu calendario', icon: 'extra' }
      setIncome((current) => item ? current.map((entry) => entry.id === item.id ? next : entry) : [...current, next])
    } else {
      const next = { id: item?.id || crypto.randomUUID(), name, amount, frequency: String(formData.get('frequency')), next: item?.next || 'Por programar', icon: item?.icon || 'market', paid: item?.paid || false }
      setPayments((current) => item ? current.map((entry) => entry.id === item.id ? next : entry) : [...current, next])
    }
    setDialog(null)
    showToast('Guardado en esta vista de ejemplo.')
  }, [dialog, showToast])

  // Alterna el check de pagos periódicos sin crear un egreso automático.
  const togglePayment = useCallback((paymentId) => {
    setPayments((current) => current.map((entry) => entry.id === paymentId ? { ...entry, paid: !entry.paid } : entry))
  }, [])

  // Archiva una cuenta solo dentro de la demo y permite revertir la acción.
  const archiveAccount = useCallback((account) => {
    setAccounts((current) => current.filter((entry) => entry.id !== account.id))
    showToast(`${account.name} se archivó en esta vista.`, () => setAccounts((current) => [...current, account]))
  }, [showToast])

  // Limpia formularios y notificaciones efímeras al desmontar la vista previa.
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') setDialog(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      window.clearTimeout(toastTimer.current)
    }
  }, [])

  // Da respuesta a accesos del marco que no cambian el foco de la propuesta de Cuentas.
  const changeSection = (label) => showToast(label === 'Cuentas' ? 'Ya estás explorando Cuentas.' : `Esta vista previa se concentra en Cuentas; ${label} queda como referencia.`)
  const openAccount = (item = null, defaultType = 'asset') => setDialog({ kind: 'account', item, defaultType })

  return <MotionConfig reducedMotion="user">
    <div className="prototype-canvas accounts-proto">
      <div className="prototype-app">
        <aside className="prototype-sidebar" aria-label="Vista de navegación de escritorio">
          <div className="prototype-brand"><span><PawPrint aria-hidden="true" /></span><b>PataWallet</b></div>
          <div className="prototype-sidebar__links">
            <SidebarItem icon={Home} label="Inicio" onClick={() => changeSection('Inicio')} />
            <SidebarItem icon={Activity} label="Actividad" onClick={() => changeSection('Actividad')} />
            <SidebarItem icon={PiggyBank} label="Plan" onClick={() => changeSection('Plan')} />
            <SidebarItem icon={WalletCards} label="Cuentas" active onClick={() => changeSection('Cuentas')} />
          </div>
          <p className="prototype-sidebar__note">Tu dinero,<br />en orden y en calma.</p>
          <small>Exploración local · datos de ejemplo</small>
        </aside>

        <div className="prototype-main">
          <header className="prototype-topbar">
            <div className="prototype-brand prototype-brand--mobile"><span><PawPrint aria-hidden="true" /></span><b>PataWallet</b></div>
            <p>Un espacio claro para tu dinero.</p>
            <button type="button" className="privacy-button" onClick={() => setHidden((value) => !value)} aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} title={hidden ? 'Mostrar montos' : 'Ocultar montos'}>{hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
          </header>

          <main className="prototype-content accounts-content">
            <div className="variant-stage" aria-live="polite">
              <ActiveComponent key={`${activeIndex}-${replayKey}`} variant={activeVariant.component} accounts={accounts} income={income} payments={payments} summary={summary} hidden={hidden} onAddAccount={(type) => openAccount(null, type)} onEditAccount={(item) => openAccount(item)} onArchiveAccount={archiveAccount} onTogglePayment={togglePayment} onAddIncome={(item) => setDialog({ kind: 'income', item: item || null })} onAddPayment={(item) => setDialog({ kind: 'payment', item: item || null })} onToast={showToast} />
            </div>
          </main>

          <nav className="prototype-dock" aria-label="Navegación de ejemplo">
            <DockItem icon={Home} label="Inicio" onClick={() => changeSection('Inicio')} />
            <DockItem icon={Activity} label="Actividad" onClick={() => changeSection('Actividad')} />
            <button type="button" className="prototype-dock__add" aria-label="Agregar cuenta" onClick={() => openAccount()}><Plus aria-hidden="true" /></button>
            <DockItem icon={PiggyBank} label="Plan" onClick={() => changeSection('Plan')} />
            <DockItem icon={WalletCards} label="Cuentas" active onClick={() => changeSection('Cuentas')} />
          </nav>
        </div>
      </div>

      <VariantPicker activeIndex={activeIndex} setActiveIndex={setActiveIndex} onReplay={() => setReplayKey((value) => value + 1)} />
      <AnimatePresence>{dialog && <AccountDialog key={`${dialog.kind}-${dialog.item?.id || 'new'}`} dialog={dialog} onClose={() => setDialog(null)} onSubmit={saveItem} />}</AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="prototype-toast accounts-toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .18 }}>{toast}{undo && <button type="button" onClick={() => { undo(); setToast(''); setUndo(null) }}>Deshacer</button>}</motion.div>}</AnimatePresence>
    </div>
  </MotionConfig>
}

// Mantiene siempre el mismo marco de navegación y marca Cuentas como sección activa.
function SidebarItem({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-sidebar__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Expone accesos funcionales dentro del marco móvil sin simular rutas ajenas a la demo.
function DockItem({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-dock__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Remonta cada composición al cambiar o reproducir y sincroniza picker, URL y teclas.
function VariantPicker({ activeIndex, setActiveIndex, onReplay }) {
  const pickerRef = useRef(null)
  const itemRefs = useRef([])

  // Desplaza el resaltado detrás de la opción activa y recalcula al cambiar ancho.
  const moveHighlight = useCallback(() => {
    const picker = pickerRef.current
    const highlight = picker?.querySelector('.proto-picker-highlight')
    const item = itemRefs.current[activeIndex]
    if (!highlight || !item) return
    highlight.style.width = `${item.offsetWidth}px`
    highlight.style.transform = `translateX(${item.offsetLeft}px)`
  }, [activeIndex])

  // Sincroniza una selección válida con query string y mantiene el cambio instantáneo.
  const selectVariant = useCallback((index) => {
    if (index < 0 || index >= variants.length) return
    setActiveIndex(index)
    const url = new URL(window.location.href)
    url.searchParams.set('v', String(index + 1))
    window.history.replaceState(null, '', url)
  }, [setActiveIndex])

  // Posiciona el selector sin animación inicial y habilita el deslizamiento tras pintar.
  useLayoutEffect(() => {
    moveHighlight()
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', '')))
    return () => window.cancelAnimationFrame(frame)
  }, [moveHighlight])

  // Permite elegir o reiniciar una propuesta por teclado sin interferir con formularios.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= variants.length) selectVariant(number - 1)
      else if (event.key === 'ArrowRight') selectVariant((activeIndex + 1) % variants.length)
      else if (event.key === 'ArrowLeft') selectVariant((activeIndex - 1 + variants.length) % variants.length)
      else if (event.key === 'r' || event.key === 'R') onReplay()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', moveHighlight)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', moveHighlight)
    }
  }, [activeIndex, moveHighlight, onReplay, selectVariant])

  return <nav className="proto-picker" aria-label="Diseños de Cuentas" data-position="top" ref={pickerRef}>
    <span className="proto-picker-highlight" aria-hidden="true"></span>
    {variants.map((variant, index) => <button key={variant.label} ref={(node) => { itemRefs.current[index] = node }} type="button" className="proto-picker-item" data-active={activeIndex === index ? '' : undefined} aria-current={activeIndex === index ? 'true' : undefined} onClick={() => selectVariant(index)}>{variant.label}</button>)}
    <span className="proto-picker-divider" aria-hidden="true"></span>
    <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Reproducir animación (R)" title="Reproducir animación (R)" onClick={onReplay}>↻</button>
  </nav>
}

// Mantiene intercambiable la pantalla activa para que el harness no contamine cada variante.
function ActiveComponent({ variant: Component, ...props }) {
  return <Component {...props} />
}

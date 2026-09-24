import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Activity, Eye, EyeOff, Home, PiggyBank, Plus, WalletCards, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ActivityCategories, ActivityExplorer, ActivityTimeline } from './ActivityLayouts.jsx'
import { ACTIVITY_DEMO, filterActivity, formatActivityMoney } from './activityData.js'

const layouts = [
  { label: 'Cronología', component: ActivityTimeline },
  { label: 'Categorías', component: ActivityCategories },
  { label: 'Explorar', component: ActivityExplorer },
]
const accountOptions = [...new Set(ACTIVITY_DEMO.map((item) => item.account))]

// Renderiza tres conceptos intercambiables de Actividad dentro del marco visual existente del prototipo.
export function ActivityPrototypeApp() {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, Math.min(layouts.length - 1, (Number(new URLSearchParams(window.location.search).get('v')) || 1) - 1)))
  const [month, setMonth] = useState('sep')
  const [type, setType] = useState('all')
  const [account, setAccount] = useState('all')
  const [category, setCategory] = useState('all')
  const [period, setPeriod] = useState('month')
  const [query, setQuery] = useState('')
  const [hidden, setHidden] = useState(false)
  const [transactions, setTransactions] = useState(ACTIVITY_DEMO)
  const [selected, setSelected] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState('')
  const pickerRef = useRef(null)
  const itemRefs = useRef([])
  const toastTimer = useRef(null)
  const filters = useMemo(() => ({ month, type, account, category, period, query }), [month, type, account, category, period, query])
  const visibleTransactions = useMemo(() => filterActivity(transactions, filters), [transactions, filters])
  const CurrentLayout = layouts[activeIndex].component

  // Muestra una confirmación breve para controles ilustrativos fuera del flujo de actividad.
  const notify = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }, [])

  // Mantiene el selector exacto del prototipo alineado tras cargar, cambiar opción o redimensionar.
  const moveHighlight = useCallback(() => {
    const highlight = pickerRef.current?.querySelector('.proto-picker-highlight')
    const item = itemRefs.current[activeIndex]
    if (!highlight || !item) return
    highlight.style.width = `${item.offsetWidth}px`
    highlight.style.transform = `translateX(${item.offsetLeft}px)`
  }, [activeIndex])

  // Guarda la variante en la URL para compartir o recuperar una composición de la vista previa.
  const selectLayout = useCallback((index) => {
    if (index < 0 || index >= layouts.length) return
    setActiveIndex(index)
    const url = new URL(window.location.href)
    url.searchParams.set('v', String(index + 1))
    window.history.replaceState(null, '', url)
  }, [])

  useLayoutEffect(() => {
    moveHighlight()
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', '')))
    return () => window.cancelAnimationFrame(frame)
  }, [moveHighlight])

  // Habilita teclado solo fuera de campos editables y libera listeners del picker al desmontar.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector('.activity-search input')?.focus()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= layouts.length) selectLayout(number - 1)
      else if (event.key === 'ArrowRight') selectLayout((activeIndex + 1) % layouts.length)
      else if (event.key === 'ArrowLeft') selectLayout((activeIndex - 1 + layouts.length) % layouts.length)
      if (event.key === 'Escape') { setDialogOpen(false); setSelected(null) }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', moveHighlight)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', moveHighlight)
      window.clearTimeout(toastTimer.current)
    }
  }, [activeIndex, moveHighlight, selectLayout])

  // Centraliza cambios de filtros y mantiene coherente el periodo cuando se navega por mes.
  const setFilter = (key, value) => {
    if (key === 'month') { setMonth(value); setPeriod('month'); return }
    if (key === 'period' && value !== 'month') setCategory('all')
    switch (key) {
      case 'type': setType(value); break
      case 'account': setAccount(value); break
      case 'category': setCategory(value); break
      case 'period': setPeriod(value); break
      case 'query': setQuery(value); break
      default: break
    }
  }

  // Restablece los filtros visibles sin modificar el mes que la persona está consultando.
  const clearFilters = () => {
    setType('all'); setAccount('all'); setCategory('all'); setPeriod('month'); setQuery('')
  }

  // Agrega un movimiento solo en memoria para demostrar cómo responde la lista y sus resúmenes.
  const addExpense = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const amount = Number(formData.get('amount'))
    const amountMinor = Math.round(amount * 100)
    if (!name || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      notify('Revisa el nombre y el monto del movimiento.')
      return
    }
    const newItem = { id: crypto.randomUUID(), month, type: 'expense', name, category: 'Sin categoría', account: 'Cuenta principal', date: 'Hoy · ahora', day: 'Hoy', daysAgo: 0, amountMinor, tone: 'market', note: 'Agregado durante esta vista previa' }
    setTransactions((current) => [newItem, ...current])
    setType('all'); setCategory('all'); setPeriod('month'); setQuery('')
    setDialogOpen(false)
    notify(`Gasto de ${formatActivityMoney(amountMinor)} agregado a la vista.`)
  }

  const changeSection = (label) => {
    if (label === 'Inicio') { window.location.assign('/'); return }
    notify(`Esta exploración está centrada en Actividad; ${label} no forma parte de esta vista previa.`)
  }
  return <MotionConfig reducedMotion="user"><div className="prototype-canvas activity-prototype">
    <div className="prototype-app"><aside className="prototype-sidebar" aria-label="Navegación de ejemplo"><a className="prototype-brand" href="/"><span><Activity aria-hidden="true" /></span><b>PataWallet</b></a><nav className="prototype-sidebar__links"><PreviewNav icon={Home} label="Inicio" onClick={() => changeSection('Inicio')} /><PreviewNav icon={Activity} label="Actividad" active onClick={() => notify('Ya estás viendo Actividad.')} /><PreviewNav icon={PiggyBank} label="Plan" onClick={() => changeSection('Plan')} /><PreviewNav icon={WalletCards} label="Cuentas" onClick={() => changeSection('Cuentas')} /></nav><p className="prototype-sidebar__note">Tus finanzas,<br />con calma y claridad.</p><small>Exploración de diseño · local</small></aside>
      <div className="prototype-main"><header className="prototype-topbar"><a className="prototype-brand prototype-brand--mobile" href="/"><span><Activity aria-hidden="true" /></span><b>PataWallet</b></a><p>Un lugar tranquilo para revisar tus movimientos.</p><button type="button" className="privacy-button" onClick={() => setHidden((value) => !value)} aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} title={hidden ? 'Mostrar montos' : 'Ocultar montos'}>{hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></header>
        <main className="prototype-content"><div className="activity-stage" aria-live="polite"><CurrentLayout key={activeIndex} transactions={visibleTransactions} allTransactions={transactions} filters={filters} setFilter={setFilter} setMonth={(value) => setFilter('month', value)} onClearFilters={clearFilters} accounts={accountOptions} hidden={hidden} onOpen={setSelected} /></div></main>
        <nav className="prototype-dock" aria-label="Navegación de ejemplo"><PreviewNav icon={Home} label="Inicio" onClick={() => changeSection('Inicio')} /><PreviewNav icon={Activity} label="Actividad" active onClick={() => notify('Ya estás viendo Actividad.')} /><button type="button" className="prototype-dock__add" aria-label="Registrar movimiento" onClick={() => setDialogOpen(true)}><Plus aria-hidden="true" /></button><PreviewNav icon={PiggyBank} label="Plan" onClick={() => changeSection('Plan')} /><PreviewNav icon={WalletCards} label="Cuentas" onClick={() => changeSection('Cuentas')} /></nav>
      </div></div>
    <VariantPicker activeIndex={activeIndex} pickerRef={pickerRef} itemRefs={itemRefs} onSelect={selectLayout} />
    <AnimatePresence>{dialogOpen && <ExpenseDialog onClose={() => setDialogOpen(false)} onSubmit={addExpense} />}{selected && <TransactionDialog item={selected} hidden={hidden} onClose={() => setSelected(null)} />}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="prototype-toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .18 }}>{toast}</motion.div>}</AnimatePresence>
  </div></MotionConfig>
}

// Mantiene enlaces de navegación interactivos sin fingir que las otras secciones están implementadas aquí.
function PreviewNav({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-sidebar__item prototype-dock__item activity-nav-item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Implementa el selector requerido para cambiar instantáneamente entre conceptos de diseño.
function VariantPicker({ activeIndex, pickerRef, itemRefs, onSelect }) {
  return <nav className="proto-picker" aria-label="Propuestas de diseño para Actividad" data-position="top" ref={pickerRef}><span className="proto-picker-highlight" aria-hidden="true" />{layouts.map((layout, index) => <button key={layout.label} ref={(node) => { itemRefs.current[index] = node }} type="button" className="proto-picker-item" data-active={activeIndex === index ? '' : undefined} aria-current={activeIndex === index ? 'true' : undefined} onClick={() => onSelect(index)}>{layout.label}</button>)}</nav>
}

// Permite agregar un gasto de muestra en memoria y valida sus campos antes de actualizar la vista.
function ExpenseDialog({ onClose, onSubmit }) {
  return <motion.div className="prototype-dialog-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.section className="prototype-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .99 }} transition={{ duration: .2, ease: [0.16, 1, 0.3, 1] }}><header><div><p className="dialog-kicker">SOLO EN ESTA EXPLORACIÓN</p><h2 id="activity-dialog-title">Nuevo gasto</h2></div><button type="button" className="dialog-close" aria-label="Cerrar formulario" onClick={onClose}><X aria-hidden="true" /></button></header><form onSubmit={onSubmit}><label>¿En qué gastaste?<input name="name" required autoFocus maxLength="48" placeholder="Ej. Café con una amiga" /></label><label>¿Cuánto pagaste?<span className="amount-field"><span>$</span><input name="amount" type="number" inputMode="numeric" min="1" step="1" required placeholder="25.000" /></span></label><p>Este gasto es ficticio y solo vive en memoria mientras la vista previa está abierta.</p><button type="submit" className="prototype-submit">Agregar a la vista</button></form></motion.section></motion.div>
}

// Presenta los metadatos de un movimiento seleccionado sin escribir datos financieros.
function TransactionDialog({ item, hidden, onClose }) {
  const positive = item.type === 'income'
  return <motion.div className="prototype-dialog-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.section className="prototype-dialog transaction-detail" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .99 }} transition={{ duration: .2, ease: [0.16, 1, 0.3, 1] }}><header><div><p className="dialog-kicker">DETALLE DEL MOVIMIENTO</p><h2 id="transaction-detail-title">{item.name}</h2></div><button type="button" className="dialog-close" aria-label="Cerrar detalle" onClick={onClose}><X aria-hidden="true" /></button></header><strong className={`detail-amount ${positive ? 'is-positive' : ''}`}>{positive ? '+' : item.type === 'transfer' ? '↔' : '−'} {formatActivityMoney(item.amountMinor, hidden)}</strong><dl><div><dt>Tipo</dt><dd>{item.type === 'expense' ? 'Gasto' : item.type === 'income' ? 'Ingreso' : 'Transferencia'}</dd></div><div><dt>Categoría</dt><dd>{item.category}</dd></div><div><dt>Cuenta</dt><dd>{item.account}</dd></div><div><dt>Fecha</dt><dd>{item.date}</dd></div><div><dt>Nota</dt><dd>{item.note || 'Sin nota'}</dd></div></dl><button type="button" className="prototype-submit" onClick={onClose}>Listo</button></motion.section></motion.div>
}

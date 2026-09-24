import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Activity, Eye, EyeOff, Home, PawPrint, PiggyBank, Plus, WalletCards, X } from 'lucide-react'
import { PLAN_DEMO, formatPlanMoney, formatPlanMonth, parsePlanPesos, shiftPlanMonth } from './fixtures.js'
import { PlanSereno } from './variants/PlanSereno.jsx'
import { PresupuestoCentral } from './variants/PresupuestoCentral.jsx'
import { MetasPrimero } from './variants/MetasPrimero.jsx'

// Asocia nombre, composición y contenido en un único orden para picker, teclado y URL.
const variants = [
  { label: 'Sereno', title: 'Plan sereno', component: PlanSereno },
  { label: 'Categorías', title: 'Presupuesto al centro', component: PresupuestoCentral },
  { label: 'Metas', title: 'Metas primero', component: MetasPrimero },
]

// Limita una selección de URL inválida a la primera propuesta.
function initialVariantIndex() {
  const value = Number.parseInt(new URLSearchParams(window.location.search).get('v'), 10)
  return Number.isInteger(value) && value >= 1 && value <= variants.length ? value - 1 : 0
}

// Presenta tres enfoques funcionales de Plan sobre cifras locales totalmente ficticias.
export function PlanPrototypeApp() {
  const [activeIndex, setActiveIndex] = useState(initialVariantIndex)
  const [mountVersion, setMountVersion] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [month, setMonth] = useState(PLAN_DEMO.seededMonth)
  const [budgets, setBudgets] = useState({ [PLAN_DEMO.seededMonth]: PLAN_DEMO.initialBudgetMinor })
  const [goals, setGoals] = useState(PLAN_DEMO.goals.map((goal) => ({ ...goal })))
  const [dialog, setDialog] = useState(null)
  const [purchaseAnalysisVisible, setPurchaseAnalysisVisible] = useState(false)
  const [purchaseChecked, setPurchaseChecked] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const previousDialogTrigger = useRef(null)
  const pickerRef = useRef(null)
  const itemRefs = useRef([])
  const activeVariant = variants[activeIndex]
  const budgetMinor = Object.hasOwn(budgets, month) ? budgets[month] : null
  const sourceCategories = useMemo(() => month === PLAN_DEMO.seededMonth
    ? PLAN_DEMO.categories
    : PLAN_DEMO.categories.map((category) => ({ ...category, amountMinor: 0 })), [month])
  const spentMinor = sourceCategories.reduce((total, category) => total + category.amountMinor, 0)
  const monthlyFreeMinor = PLAN_DEMO.monthlyIncomeMinor - PLAN_DEMO.fixedExpensesMinor - PLAN_DEMO.debtPaymentsMinor - spentMinor
  const [year, monthNumber] = month.split('-').map(Number)
  const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 15)))
  const model = useMemo(() => ({
    month,
    monthLabel,
    budgetMinor,
    spentMinor,
    monthlyFreeMinor,
    salaryMinor: PLAN_DEMO.monthlyIncomeMinor,
    fixedMinor: PLAN_DEMO.fixedExpensesMinor,
    debtMinor: PLAN_DEMO.debtPaymentsMinor,
    categories: sourceCategories,
    goals,
    purchase: PLAN_DEMO.plannedPurchase,
    nextPayDate: month === PLAN_DEMO.seededMonth ? PLAN_DEMO.nextPayDate : null,
    purchaseChecked,
    analysisVisible: purchaseAnalysisVisible,
  }), [month, monthLabel, budgetMinor, spentMinor, monthlyFreeMinor, sourceCategories, goals, purchaseChecked, purchaseAnalysisVisible])

  // Muestra avisos temporales claros y descarta temporizadores al cambiar de acción.
  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  // Guarda selección y montaje en paralelo para que incluso repetir la opción la vuelva a reproducir.
  const selectVariant = useCallback((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= variants.length) return
    setActiveIndex(index)
    setMountVersion((version) => version + 1)
    const url = new URL(window.location.href)
    url.searchParams.set('v', String(index + 1))
    window.history.replaceState(null, '', url)
  }, [])

  // Reposiciona el indicador del selector sin animarlo durante la primera carga.
  const moveHighlight = useCallback(() => {
    const highlight = pickerRef.current?.querySelector('.proto-picker-highlight')
    const item = itemRefs.current[activeIndex]
    if (!highlight || !item) return
    highlight.style.width = `${item.offsetWidth}px`
    highlight.style.transform = `translateX(${item.offsetLeft}px)`
  }, [activeIndex])

  // Expone las opciones por flechas y números, respetando formularios y teclas modificadoras.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      const number = Number.parseInt(event.key, 10)
      if (number >= 1 && number <= variants.length) selectVariant(number - 1)
      else if (event.key === 'ArrowRight') selectVariant((activeIndex + 1) % variants.length)
      else if (event.key === 'ArrowLeft') selectVariant((activeIndex - 1 + variants.length) % variants.length)
      else if (event.key === 'r' || event.key === 'R') setMountVersion((version) => version + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, selectVariant])

  // Activa el movimiento del selector tras el primer paint y desmonta los recursos temporales.
  useLayoutEffect(() => {
    moveHighlight()
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => pickerRef.current?.setAttribute('data-ready', '')))
    window.addEventListener('resize', moveHighlight)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', moveHighlight)
    }
  }, [moveHighlight])

  // Recupera el foco al cerrar el diálogo y cierra avisos con la tecla Escape.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setDialog(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!dialog && previousDialogTrigger.current instanceof HTMLElement) {
      previousDialogTrigger.current.focus()
      previousDialogTrigger.current = null
    }
  }, [dialog])

  // Conserva foco de retorno cuando se abre un formulario desde una acción de la pantalla.
  const openDialog = useCallback((nextDialog) => {
    previousDialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDialog(nextDialog)
  }, [])

  // Cambia el límite del mes en memoria, sin crear ni editar saldos o movimientos.
  const saveBudget = (event) => {
    event.preventDefault()
    const amountMinor = parsePlanPesos(new FormData(event.currentTarget).get('amount'))
    if (amountMinor === null) {
      showToast('Ingresa un presupuesto válido en pesos enteros.')
      return
    }
    setBudgets((current) => ({ ...current, [month]: amountMinor }))
    setDialog(null)
    showToast('Presupuesto actualizado solo en esta vista de ejemplo.')
  }

  // Crea una meta de prueba con monto entero y fecha de calendario opcional.
  const saveGoal = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const targetMinor = parsePlanPesos(form.get('amount'))
    const dueDate = String(form.get('dueDate') || '') || null
    if (!name || !targetMinor) {
      showToast('Revisa el nombre y el monto de tu meta.')
      return
    }
    setGoals((current) => [...current, { id: crypto.randomUUID(), name, targetMinor, reservedMinor: 0, dueDate }])
    setDialog(null)
    showToast('Meta agregada a esta vista de ejemplo.')
  }

  // Añade una reserva de prueba limitada al avance pendiente; no modifica una cuenta bancaria.
  const saveReservation = (event) => {
    event.preventDefault()
    const goalId = dialog?.goalId
    const goal = goals.find((item) => item.id === goalId)
    const amountMinor = parsePlanPesos(new FormData(event.currentTarget).get('amount'))
    const pendingMinor = goal ? goal.targetMinor - goal.reservedMinor : 0
    if (!goal || !amountMinor || amountMinor > pendingMinor) {
      showToast('El monto debe ser mayor que cero y no superar lo que falta para la meta.')
      return
    }
    setGoals((current) => current.map((item) => item.id === goalId ? { ...item, reservedMinor: item.reservedMinor + amountMinor } : item))
    setDialog(null)
    showToast('Reserva de ejemplo actualizada; no se movió dinero real.')
  }

  // Consolida acciones compartidas para que cada variante opere sobre el mismo estado de demostración.
  const actions = {
    shiftMonth: (delta) => setMonth((current) => shiftPlanMonth(current, delta)),
    editBudget: () => openDialog({ type: 'budget' }),
    newGoal: () => openDialog({ type: 'goal' }),
    reserve: (goal) => openDialog({ type: 'reserve', goalId: goal.id }),
    evaluatePurchase: () => {
      setPurchaseAnalysisVisible((visible) => !visible)
      setPurchaseChecked(true)
    },
  }

  // Mantiene la navegación como contexto; los demás módulos no forman parte de esta exploración.
  const showSectionToast = (label) => showToast(label === 'Plan' ? 'Ya estás en Plan.' : `Esta exploración se enfoca en Plan; ${label} queda como referencia.`)

  return <MotionConfig reducedMotion="user">
    <div className="prototype-canvas" id="plan-prototype">
      <div className="prototype-app plan-prototype-app">
        <aside className="prototype-sidebar" aria-label="Vista de navegación de escritorio">
          <div className="prototype-brand"><span><PawPrint aria-hidden="true" /></span><b>PataWallet</b></div>
          <div className="prototype-sidebar__links">
            <SidebarItem icon={Home} label="Inicio" onClick={() => showSectionToast('Inicio')} />
            <SidebarItem icon={Activity} label="Actividad" onClick={() => showSectionToast('Actividad')} />
            <SidebarItem icon={PiggyBank} label="Plan" active onClick={() => showSectionToast('Plan')} />
            <SidebarItem icon={WalletCards} label="Cuentas" onClick={() => showSectionToast('Cuentas')} />
          </div>
          <p className="prototype-sidebar__note">Tus metas,<br />con mejor compañía.</p>
          <small>Exploración de diseño · local</small>
        </aside>

        <div className="prototype-main plan-prototype-main">
          <header className="prototype-topbar plan-prototype-topbar">
            <div className="prototype-brand prototype-brand--mobile"><span><PawPrint aria-hidden="true" /></span><b>PataWallet</b></div>
            <p>Un lugar tranquilo para tus cuentas.</p>
            <button type="button" className="privacy-button" onClick={() => setHidden((value) => !value)} aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} title={hidden ? 'Mostrar montos' : 'Ocultar montos'}>{hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
          </header>

          <main className="prototype-content plan-prototype-content">
            <div className="variant-stage" aria-live="polite">
              {(() => {
                const ActiveComponent = activeVariant.component
                return <ActiveComponent key={`${activeIndex}-${mountVersion}`} model={model} hidden={hidden} actions={actions} />
              })()}
            </div>
          </main>

          <nav className="prototype-dock" aria-label="Navegación de ejemplo">
            <DockItem icon={Home} label="Inicio" onClick={() => showSectionToast('Inicio')} />
            <DockItem icon={Activity} label="Actividad" onClick={() => showSectionToast('Actividad')} />
            <button type="button" className="prototype-dock__add" aria-label="Nuevo movimiento" onClick={() => showToast('Los movimientos se registran desde Actividad.')}><Plus aria-hidden="true" /></button>
            <DockItem icon={PiggyBank} label="Plan" active onClick={() => showSectionToast('Plan')} />
            <DockItem icon={WalletCards} label="Cuentas" onClick={() => showSectionToast('Cuentas')} />
          </nav>
        </div>
      </div>

      <VariantPicker activeIndex={activeIndex} selectVariant={selectVariant} pickerRef={pickerRef} itemRefs={itemRefs} />
      <PlanDialog dialog={dialog} month={month} budgetMinor={budgetMinor} goals={goals} onClose={() => setDialog(null)} onBudget={saveBudget} onGoal={saveGoal} onReserve={saveReservation} />
      <AnimatePresence>{toast && <motion.div className="prototype-toast plan-prototype-toast" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .18 }}>{toast}</motion.div>}</AnimatePresence>
    </div>
  </MotionConfig>
}

// Presenta un destino activo y conserva los demás accesos como controles de contexto funcionales.
function SidebarItem({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-sidebar__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Mantiene los controles inferiores cómodos en móvil y señala Plan como sección actual.
function DockItem({ icon: Icon, label, active = false, onClick }) {
  return <button type="button" className={`prototype-dock__item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon aria-hidden="true" /><span>{label}</span></button>
}

// Implementa el selector compartido, su indicador animado, acceso por teclado y repetición de entrada.
function VariantPicker({ activeIndex, selectVariant, pickerRef, itemRefs }) {
  const variantsForPicker = variants
  const replay = () => selectVariant(activeIndex)
  return <nav className="proto-picker" aria-label="Prototype variants" data-position="top" ref={pickerRef}>
    <span className="proto-picker-highlight" aria-hidden="true" />
    {variantsForPicker.map((variant, index) => <button key={variant.label} ref={(node) => { itemRefs.current[index] = node }} type="button" className="proto-picker-item" data-active={activeIndex === index ? '' : undefined} aria-current={activeIndex === index ? 'true' : undefined} aria-label={variant.title} onClick={() => selectVariant(index)}>{variant.label}</button>)}
    <span className="proto-picker-divider" aria-hidden="true" />
    <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" title="Replay animation (R)" onClick={replay}>↻</button>
  </nav>
}

// Ofrece formularios de ejemplo para editar el presupuesto, crear una meta y registrar una reserva local.
function PlanDialog({ dialog, month, budgetMinor, goals, onClose, onBudget, onGoal, onReserve }) {
  const goal = dialog?.type === 'reserve' ? goals.find((item) => item.id === dialog.goalId) : null
  if (!dialog) return null

  const title = dialog.type === 'budget' ? 'Límite del presupuesto' : dialog.type === 'goal' ? 'Nueva meta' : `Apartar para ${goal?.name || 'tu meta'}`
  const submit = dialog.type === 'budget' ? onBudget : dialog.type === 'goal' ? onGoal : onReserve
  const defaultAmount = dialog.type === 'budget'
    ? (budgetMinor ?? PLAN_DEMO.initialBudgetMinor) / 100
    : dialog.type === 'reserve' && goal ? Math.max(1, Math.min(150_000, (goal.targetMinor - goal.reservedMinor) / 100)) : ''

  return <motion.div className="prototype-dialog-backdrop plan-dialog-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <motion.section className="prototype-dialog plan-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title" initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .99 }} transition={{ duration: .2, ease: [0.16, 1, 0.3, 1] }}>
      <header><div><p className="dialog-kicker">SOLO EN ESTA EXPLORACIÓN</p><h2 id="plan-dialog-title">{title}</h2></div><button type="button" className="dialog-close" aria-label="Cerrar formulario" onClick={onClose}><X aria-hidden="true" /></button></header>
      <form key={dialog.type} onSubmit={submit}>
        {dialog.type === 'budget' && <>
          <label>Presupuesto total de {formatPlanMonth(month)}<span className="amount-field"><span>$</span><input name="amount" type="number" inputMode="numeric" min="1" max="1000000000" step="1" required defaultValue={defaultAmount} autoFocus /></span></label>
          <p>El cambio solo ajusta este límite de demostración; no altera cuentas ni gastos.</p>
        </>}
        {dialog.type === 'goal' && <>
          <label>Nombre de la meta<input name="name" type="text" required minLength="2" maxLength="48" placeholder="Ej. Un viaje especial" autoFocus /></label>
          <label>Monto objetivo<span className="amount-field"><span>$</span><input name="amount" type="number" inputMode="numeric" min="1" max="1000000000" step="1" required placeholder="2.000.000" /></span></label>
          <label>Fecha objetivo <span className="plan-dialog-optional">Opcional</span><input name="dueDate" type="date" /></label>
          <p>La meta es una referencia de ahorro; crearla no reserva ni mueve dinero.</p>
        </>}
        {dialog.type === 'reserve' && goal && <>
          <label>Monto para apartar<span className="amount-field"><span>$</span><input name="amount" type="number" inputMode="numeric" min="1" max={Math.max(1, Math.floor((goal.targetMinor - goal.reservedMinor) / 100))} step="1" required defaultValue={defaultAmount} autoFocus /></span></label>
          <p>Faltan {formatPlanMoney(goal.targetMinor - goal.reservedMinor)}. Este ejemplo no cambia saldos ni crea movimientos.</p>
        </>}
        <button type="submit" className="prototype-submit">{dialog.type === 'budget' ? 'Guardar límite de ejemplo' : dialog.type === 'goal' ? 'Crear meta de ejemplo' : 'Agregar reserva de ejemplo'}</button>
      </form>
    </motion.section>
  </motion.div>
}

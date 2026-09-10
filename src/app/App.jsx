import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, CalendarDays, Check,
  ChevronRight, CircleDollarSign, CreditCard, Eye, EyeOff, Goal, Home,
  Landmark, Menu, Moon, MoreHorizontal, PawPrint, Pencil, PiggyBank, Plus,
  Search, Settings, ShoppingBasket, Smartphone, Sun, Trash2, Undo2,
  Utensils, WalletCards, X, BusFront, BriefcaseBusiness,
} from 'lucide-react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { db, makeId, resetDemo, seedDemo } from '../data/db.js'
import { calculateSummary, goalProgress } from '../domain/finance.js'
import { formatMinor, parseLocalizedAmount, toInputAmount } from '../domain/money.js'
import { PetScene } from '../components/PetScene.jsx'

const AppContext = createContext(null)
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const currentMonth = () => today().slice(0, 7)
const iconForType = { expense: ArrowUpRight, income: ArrowDownLeft, transfer: ArrowLeftRight, card_payment: CreditCard, opening: Landmark, refund: Undo2, adjustment: MoreHorizontal }
const labelForType = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', card_payment: 'Pago de tarjeta', opening: 'Saldo inicial', refund: 'Reembolso', adjustment: 'Ajuste' }

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    seedDemo().then(() => setReady(true)).catch(() => setError('No pudimos abrir el almacenamiento local. Revisa los permisos del navegador y vuelve a intentar.'))
  }, [])
  if (error) return <StateMessage title="No pudimos abrir PataWallet" body={error} action={() => location.reload()} actionLabel="Reintentar" />
  if (!ready) return <LoadingScreen />
  return <DemoApp />
}

function DemoApp() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], [])
  const categories = useLiveQuery(() => db.categories.toArray(), [], [])
  const transactions = useLiveQuery(() => db.transactions.orderBy('occurred_at').reverse().toArray(), [], [])
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], [])
  const goals = useLiveQuery(() => db.goals.toArray(), [], [])
  const allocations = useLiveQuery(() => db.allocations.toArray(), [], [])
  const settingsRows = useLiveQuery(() => db.settings.toArray(), [], [])
  const settingsMap = useMemo(() => Object.fromEntries(settingsRows.map((row) => [row.key, row.value])), [settingsRows])
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState(null)
  const systemReduce = useReducedMotion()
  const reduceMotion = settingsMap.motion === 'off' || (settingsMap.motion === 'system' && systemReduce)

  useEffect(() => {
    const root = document.documentElement
    const preferred = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.dataset.theme = settingsMap.theme === 'system' || !settingsMap.theme ? preferred : settingsMap.theme
    root.dataset.motion = settingsMap.motion || 'system'
  }, [settingsMap.theme, settingsMap.motion])

  if (!settingsRows.length) return <LoadingScreen />
  if (!settingsMap.entered) return <Welcome />

  const notify = (message, undo) => {
    setToast({ message, undo })
    window.setTimeout(() => setToast(null), 5000)
  }
  const value = { accounts, categories, transactions, budgets, goals, allocations, settings: settingsMap, reduceMotion, setSheet, notify }
  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={settingsMap.motion === 'off' ? 'always' : settingsMap.motion === 'soft' ? 'never' : 'user'}>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/actividad" element={<Activity />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/cuentas" element={<Accounts />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="/ajustes/notificaciones" element={<Notifications />} />
          <Route path="/ajustes/automatizacion" element={<Automation />} />
          <Route path="*" element={<StateMessage title="Esta página no existe" body="Vuelve al inicio para continuar." actionLabel="Ir al inicio" action={() => { location.href = '/' }} />} />
        </Routes>
      </Shell>
      <AnimatePresence>{sheet && <MovementSheet transaction={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} />}</AnimatePresence>
      <AnimatePresence>{toast && <Toast toast={toast} close={() => setToast(null)} />}</AnimatePresence>
      </MotionConfig>
    </AppContext.Provider>
  )
}

function useApp() { return useContext(AppContext) }

function useModalBehavior(ref, close) {
  const opener = useRef(document.activeElement)
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close }, [close])
  useEffect(() => {
    const shell = document.querySelector('.app-shell')
    const previousOverflow = document.body.style.overflow
    shell?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const onKeyDown = (event) => { if (event.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKeyDown)
    const previousOpener = opener.current
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      shell?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      previousOpener?.focus?.()
    }
  }, [ref])
}

function Welcome() {
  return (
    <main className="welcome">
      <div className="wordmark welcome__brand"><PawPrint aria-hidden="true" /> PataWallet</div>
      <section className="welcome__intro">
        <p className="eyebrow">Tu espacio financiero</p>
        <h1>Organiza tu dinero con buena compañía.</h1>
        <p>Entiende tus cuentas, cuida tu presupuesto y avanza hacia tus metas con calma.</p>
      </section>
      <div className="welcome__art"><PetScene name="welcome" hero /></div>
      <section className="welcome__actions">
        <button className="button button--primary button--wide" onClick={() => db.settings.put({ key: 'entered', value: true })}>Probar con datos de ejemplo</button>
        <p className="demo-note">Datos ficticios. Se guardan solo en este navegador.</p>
      </section>
    </main>
  )
}

function Shell({ children }) {
  const { setSheet } = useApp()
  const location = useLocation()
  const mainRef = useRef(null)
  useEffect(() => { mainRef.current?.focus({ preventScroll: true }) }, [location.pathname])
  const nav = [
    ['/', Home, 'Inicio'], ['/actividad', Menu, 'Actividad'], ['/plan', PiggyBank, 'Plan'], ['/cuentas', WalletCards, 'Cuentas'],
  ]
  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Navegación principal">
        <div className="wordmark wordmark--small"><PawPrint /> <span>PataWallet</span></div>
        <nav>{nav.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}</nav>
        <button className="side-nav__add" onClick={() => setSheet('new')}><Plus /> Nuevo movimiento</button>
        <NavLink to="/ajustes"><Settings /> <span>Ajustes</span></NavLink>
        <p className="side-nav__demo">Demo local</p>
      </aside>
      <div className="mobile-top"><span className="wordmark wordmark--small"><PawPrint /> PataWallet</span><Link to="/ajustes" aria-label="Abrir ajustes"><Settings /></Link></div>
      <main ref={mainRef} tabIndex="-1" className="page" aria-label="Contenido principal">{children}</main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {nav.slice(0, 2).map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}
        <button aria-label="Nuevo movimiento" onClick={() => setSheet('new')}><Plus /></button>
        {nav.slice(2).map(([to, Icon, label]) => <NavLink key={to} to={to}><Icon /><span>{label}</span></NavLink>)}
      </nav>
      <OnlineStatus />
    </div>
  )
}

function OnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return online ? null : <div className="local-status" role="status">Sin conexión. Tus cambios se guardan en este navegador.</div>
}

function PageHeader({ title, subtitle, action }) {
  return <header className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</header>
}

function Dashboard() {
  const { accounts, transactions, budgets, settings, setSheet } = useApp()
  const [month, setMonth] = useState(currentMonth())
  const summary = calculateSummary(accounts, transactions, month)
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const remaining = budget ? budget.limit_minor - summary.expenses : 0
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0
  const recent = transactions.filter((item) => !['opening', 'adjustment'].includes(item.type)).slice(0, 4)
  const hidden = Boolean(settings.hiddenAmounts)
  return (
    <div className="route-stack">
      <PageHeader title="Hola, Danilo" subtitle="Qué bueno tenerte por aquí." action={<button className="icon-button" aria-label={hidden ? 'Mostrar montos' : 'Ocultar montos'} onClick={() => db.settings.put({ key: 'hiddenAmounts', value: !hidden })}>{hidden ? <EyeOff /> : <Eye />}</button>} />
      <DemoBanner />
      <section className="balance-hero">
        <div className="balance-hero__numbers"><span>Saldo en cuentas</span><strong aria-label={hidden ? 'Monto oculto' : undefined}>{formatMinor(summary.assets, 'COP', hidden)}</strong><small>Dinero registrado en activos</small></div>
        <div className="balance-hero__scene" aria-hidden="true"><PetScene name="welcome" /></div>
      </section>
      <div className="month-row"><label htmlFor="month-home">Mes</label><input id="month-home" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></div>
      <section className="stat-grid" aria-label="Resumen del mes">
        <Stat icon={ArrowDownLeft} label="Ingresos" value={formatMinor(summary.income, 'COP', hidden)} tone="positive" />
        <Stat icon={ArrowUpRight} label="Gastos" value={formatMinor(summary.expenses, 'COP', hidden)} tone="negative" />
        <Stat icon={CreditCard} label="Deuda" value={formatMinor(summary.debt, 'COP', hidden)} />
      </section>
      <section className="feature-panel budget-summary">
        <div className="section-heading"><div><h2>Presupuesto mensual</h2><p>{remaining >= 0 ? `Te quedan ${formatMinor(remaining, 'COP', hidden)}` : `Superaste el presupuesto por ${formatMinor(Math.abs(remaining), 'COP', hidden)}`}</p></div><Link to="/plan">Ver plan</Link></div>
        <Progress value={used} label={`${Math.round(used)}% usado`} />
      </section>
      <section>
        <div className="section-heading"><h2>Últimos movimientos</h2><Link to="/actividad">Ver todos</Link></div>
        <TransactionList items={recent} compact />
      </section>
      <button className="button button--primary desktop-hidden" onClick={() => setSheet('new')}><Plus /> Registrar movimiento</button>
    </div>
  )
}

function DemoBanner() { return <div className="demo-banner"><span>Datos de ejemplo</span><p>Guardados solo en este navegador</p></div> }
function Stat({ icon: Icon, label, value, tone = '' }) { return <div className={`stat ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div> }

function Progress({ value, label }) {
  const { reduceMotion } = useApp()
  const safe = Math.max(0, Math.min(value, 100))
  return <div className="progress-wrap"><div className="progress-meta"><span>{label}</span><span>{value > 100 ? `${Math.round(value - 100)}% por encima` : ''}</span></div><div className="progress" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(safe)}><motion.span initial={false} animate={{ width: `${safe}%` }} transition={{ duration: reduceMotion ? 0 : 0.4 }} /></div></div>
}

function Activity() {
  const { transactions, accounts, categories } = useApp()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [account, setAccount] = useState('all')
  const items = transactions.filter((item) => {
    const text = `${item.merchant_name || ''} ${item.note || ''} ${categories.find((cat) => cat.id === item.category_id)?.name || ''}`.toLowerCase()
    const accountMatches = account === 'all' || item.from_account_id === account || item.to_account_id === account
    return !['opening', 'adjustment'].includes(item.type) && text.includes(query.toLowerCase()) && (type === 'all' || item.type === type) && accountMatches
  })
  return (
    <div className="route-stack">
      <PageHeader title="Actividad" subtitle={`${items.length} movimientos visibles`} />
      <div className="search-box"><Search /><label className="sr-only" htmlFor="search">Buscar movimientos</label><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por comercio, nota o categoría" /></div>
      <div className="filters" aria-label="Filtros de movimientos">
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar por tipo"><option value="all">Todos los tipos</option><option value="expense">Gastos</option><option value="income">Ingresos</option><option value="transfer">Transferencias</option><option value="card_payment">Pagos de tarjeta</option></select>
        <select value={account} onChange={(event) => setAccount(event.target.value)} aria-label="Filtrar por cuenta"><option value="all">Todas las cuentas</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      {items.length ? <TransactionList items={items} grouped /> : <StateMessage illustration="empty" title="No encontramos movimientos" body="Prueba otros filtros o registra un nuevo movimiento." />}
    </div>
  )
}

function categoryPresentation(category, type) {
  if (type === 'income') return { Icon: BriefcaseBusiness, tone: 'salary' }
  const name = category?.name?.toLowerCase() || ''
  if (name.includes('mercado')) return { Icon: ShoppingBasket, tone: 'market' }
  if (name.includes('transporte')) return { Icon: BusFront, tone: 'transport' }
  if (name.includes('mascota')) return { Icon: PawPrint, tone: 'pets' }
  if (name.includes('restaurante')) return { Icon: Utensils, tone: 'food' }
  return { Icon: iconForType[type] || CircleDollarSign, tone: type }
}

function transactionDateLabel(value) {
  const date = value.slice(0, 10)
  if (date === today()) return 'Hoy'
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date(`${date}T12:00:00-05:00`))
}

function TransactionList({ items, compact = false, grouped = false }) {
  const { accounts, categories, setSheet, settings } = useApp()
  const renderItem = (item) => {
    const category = categories.find((cat) => cat.id === item.category_id)
    const { Icon, tone } = categoryPresentation(category, item.type)
    const account = accounts.find((acc) => acc.id === (item.from_account_id || item.to_account_id))
    const expense = item.type === 'expense'
    const income = item.type === 'income' || item.type === 'refund'
    return <button className="transaction" key={item.id} onClick={() => setSheet(item)}>
      <span className={`transaction__icon tone-${tone}`}><Icon /></span>
      <span className="transaction__main"><strong>{item.merchant_name || labelForType[item.type]}</strong><small>{category?.name || labelForType[item.type]}{account ? ` · ${account.name}` : ''}</small></span>
      <span className={`transaction__amount ${income ? 'positive' : expense ? 'negative' : ''}`}><strong>{income ? '+' : expense ? '-' : ''}{formatMinor(item.amount_minor, item.currency, settings.hiddenAmounts)}</strong><small>{new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(new Date(item.occurred_at))}</small></span>
      <ChevronRight className="transaction__chevron" />
    </button>
  }
  if (!grouped) return <div className={`transaction-list ${compact ? 'compact' : ''}`}>{items.map(renderItem)}</div>
  const groups = items.reduce((result, item) => {
    const date = item.occurred_at.slice(0, 10)
    if (!result[date]) result[date] = []
    result[date].push(item)
    return result
  }, {})
  return <div className="activity-groups">{Object.entries(groups).map(([date, group]) => <section className="transaction-group" key={date}><h2>{transactionDateLabel(group[0].occurred_at)}</h2><div className="transaction-list">{group.map(renderItem)}</div></section>)}</div>
}

function BudgetRing({ value }) {
  const safe = Math.max(0, Math.min(value, 100))
  const circumference = 2 * Math.PI * 42
  return <div className="budget-ring"><svg viewBox="0 0 100 100" role="img" aria-label={`${Math.round(value)}% del presupuesto usado`}><circle className="budget-ring__track" cx="50" cy="50" r="42" /><circle className="budget-ring__value" cx="50" cy="50" r="42" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe / 100)} /></svg><strong>{Math.round(value)}%</strong></div>
}

function Plan() {
  const { accounts, transactions, budgets, goals, allocations, settings, notify } = useApp()
  const month = currentMonth()
  const summary = calculateSummary(accounts, transactions, month)
  const budget = budgets.find((item) => item.month === month) || budgets[0]
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [allocationGoal, setAllocationGoal] = useState(null)
  const [celebration, setCelebration] = useState(false)
  const used = budget?.limit_minor ? (summary.expenses / budget.limit_minor) * 100 : 0
  return (
    <div className="route-stack">
      <PageHeader title="Tu plan" subtitle="Presupuesto y metas, sin mover dinero del banco." />
      <section className="feature-panel plan-hero">
        <div className="plan-hero__heading"><span className="eyebrow">Presupuesto de {new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(`${month}-15T12:00:00`))}</span><h2>Tu presupuesto</h2></div>
        <div className="plan-hero__metric"><BudgetRing value={used} /><div><span>Has usado</span><strong>{formatMinor(summary.expenses, 'COP', settings.hiddenAmounts)}</strong><small>de {formatMinor(budget?.limit_minor || 0, 'COP', settings.hiddenAmounts)}</small><p>{budget && budget.limit_minor - summary.expenses >= 0 ? `Te quedan ${formatMinor(budget.limit_minor - summary.expenses, 'COP', settings.hiddenAmounts)}.` : `Superaste el límite por ${formatMinor(summary.expenses - (budget?.limit_minor || 0), 'COP', settings.hiddenAmounts)}.`}</p></div></div>
        <PetScene name="budget" />
        <button className="button button--secondary" onClick={() => setBudgetOpen(true)}><Pencil /> Editar límite</button>
      </section>
      <section>
        <div className="section-heading"><div><h2>Metas</h2><p>Las reservas son organización interna.</p></div><button className="button button--quiet" onClick={() => setGoalOpen(true)}><Plus /> Nueva meta</button></div>
        <div className="goals-grid">{goals.map((goal) => {
          const progress = goalProgress(goal, allocations)
          return <article className="goal-card" key={goal.id}><div className="goal-card__top"><span className="goal-icon"><Goal /></span><button className="icon-button icon-button--small" aria-label={`Eliminar meta ${goal.name}`} onClick={async () => { const related = allocations.filter((item) => item.goal_id === goal.id); await db.transaction('rw', db.goals, db.allocations, async () => { await db.goals.delete(goal.id); await db.allocations.bulkDelete(related.map((item) => item.id)) }); notify('Meta eliminada') }}><Trash2 /></button></div><h3>{goal.name}</h3><p>{formatMinor(progress.reserved, 'COP', settings.hiddenAmounts)} de {formatMinor(goal.target_minor, 'COP', settings.hiddenAmounts)}</p><Progress value={progress.percent} label={`${Math.round(progress.percent)}% completado`} /><button className="button button--secondary" onClick={() => setAllocationGoal(goal)}>Reservar dinero</button></article>
        })}</div>
      </section>
      <AnimatePresence>{budgetOpen && <SimpleDialog title="Editar presupuesto" close={() => setBudgetOpen(false)}><MoneyAction initial={budget?.limit_minor} label="Límite mensual" button="Guardar límite" onSubmit={async (amount) => { await db.budgets.put({ month, limit_minor: amount }); setBudgetOpen(false); notify('Presupuesto actualizado') }} /></SimpleDialog>}</AnimatePresence>
      <AnimatePresence>{goalOpen && <GoalDialog close={() => setGoalOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{allocationGoal && <SimpleDialog title={`Reservar para ${allocationGoal.name}`} close={() => setAllocationGoal(null)}><AllocationForm goal={allocationGoal} close={() => setAllocationGoal(null)} onComplete={() => setCelebration(true)} /></SimpleDialog>}</AnimatePresence>
      <AnimatePresence>{celebration && <SimpleDialog title="Meta cumplida" close={() => setCelebration(false)}><div className="celebration"><PetScene name="success" /><h3>Lo lograste</h3><p>La reserva alcanzó el objetivo de esta meta.</p><button className="button button--primary" onClick={() => setCelebration(false)}>Continuar</button></div></SimpleDialog>}</AnimatePresence>
    </div>
  )
}

function MoneyAction({ initial = 0, label, button, onSubmit }) {
  const [amount, setAmount] = useState(initial ? toInputAmount(initial) : '')
  const [error, setError] = useState('')
  return <form onSubmit={async (event) => { event.preventDefault(); try { await onSubmit(parseLocalizedAmount(amount)) } catch (issue) { setError(issue.message) } }}><Field label={label} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></Field><button className="button button--primary" type="submit">{button}</button></form>
}

function GoalDialog({ close }) {
  const { notify } = useApp(); const [name, setName] = useState(''); const [amount, setAmount] = useState(''); const [error, setError] = useState('')
  return <SimpleDialog title="Nueva meta" close={close}><form onSubmit={async (event) => { event.preventDefault(); try { if (name.trim().length < 2) throw new Error('Escribe un nombre para la meta.'); await db.goals.add({ id: makeId('goal'), name: name.trim(), target_minor: parseLocalizedAmount(amount), currency: 'COP', completed_seen: false }); notify('Meta creada'); close() } catch (issue) { setError(issue.message) } }}><Field label="Nombre"><input value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Monto objetivo" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="2.000.000" /></Field><button className="button button--primary" type="submit">Crear meta</button></form></SimpleDialog>
}

function AllocationForm({ goal, close, onComplete }) {
  const { accounts, allocations, notify } = useApp(); const [account, setAccount] = useState(accounts.find((item) => item.kind === 'asset')?.id || ''); const [amount, setAmount] = useState(''); const [error, setError] = useState('')
  return <form onSubmit={async (event) => { event.preventDefault(); try { const minor = parseLocalizedAmount(amount); const allocatedForAccount = allocations.filter((item) => item.account_id === account).reduce((sum, item) => sum + Number(item.amount_minor), 0); const reservedForGoal = allocations.filter((item) => item.goal_id === goal.id).reduce((sum, item) => sum + Number(item.amount_minor), 0); const transactions = await db.transactions.toArray(); const summary = calculateSummary(accounts, transactions, currentMonth()); if (allocatedForAccount + minor > (summary.balances[account] || 0)) throw new Error('Esta reserva no está cubierta por el saldo registrado de la cuenta.'); await db.transaction('rw', db.allocations, db.goals, async () => { await db.allocations.add({ id: makeId('allocation'), goal_id: goal.id, account_id: account, amount_minor: minor, allocated_on: today() }); if (!goal.completed_seen && reservedForGoal + minor >= Number(goal.target_minor)) await db.goals.update(goal.id, { completed_seen: true }) }); notify('Reserva actualizada'); close(); if (!goal.completed_seen && reservedForGoal + minor >= Number(goal.target_minor)) onComplete() } catch (issue) { setError(issue.message) } }}><Field label="Cuenta"><select value={account} onChange={(event) => setAccount(event.target.value)}>{accounts.filter((item) => item.kind === 'asset' && !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Monto" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="300.000" /></Field><p className="helper">Reservar no mueve dinero ni modifica el saldo de la cuenta.</p><button className="button button--primary" type="submit">Crear reserva</button></form>
}

function Accounts() {
  const { accounts, transactions, settings, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const summary = calculateSummary(accounts, transactions, currentMonth())
  const groups = [['Dinero en cuentas', 'asset'], ['Tarjetas y deuda', 'liability']]
  return <div className="route-stack"><PageHeader title="Cuentas" subtitle="Activos y deudas se muestran por separado." action={<button className="button button--quiet" onClick={() => setOpen(true)}><Plus /> Agregar</button>} />
    <section className="account-summary"><div><span>Activos registrados</span><strong>{formatMinor(summary.assets, 'COP', settings.hiddenAmounts)}</strong></div><div><span>Deuda registrada</span><strong>{formatMinor(summary.debt, 'COP', settings.hiddenAmounts)}</strong></div><div><span>Posición neta</span><strong>{formatMinor(summary.net, 'COP', settings.hiddenAmounts)}</strong></div></section>
    {groups.map(([title, kind]) => <section key={kind}><div className="section-heading"><h2>{title}</h2></div><div className="account-list">{accounts.filter((item) => item.kind === kind && !item.archived).map((item) => <article className="account-row" key={item.id}><span className="account-row__icon">{kind === 'asset' ? <Landmark /> : <CreditCard />}</span><div><h3>{item.name}</h3><p>{item.subtype === 'cash' ? 'Efectivo' : kind === 'liability' ? 'Tarjeta de crédito' : 'Cuenta de activo'}</p></div><strong>{formatMinor(summary.balances[item.id] || 0, 'COP', settings.hiddenAmounts)}</strong><button className="icon-button icon-button--small" aria-label={`Editar ${item.name}`} onClick={() => setEditingAccount(item)}><Pencil /></button><button className="icon-button icon-button--small" aria-label={`Archivar ${item.name}`} onClick={async () => { if (!confirm(`¿Archivar ${item.name}? Sus movimientos se conservarán.`)) return; await db.accounts.update(item.id, { archived: true }); notify('Cuenta archivada') }}><Trash2 /></button></article>)}</div></section>)}
    <AnimatePresence>{open && <AccountDialog close={() => setOpen(false)} />}</AnimatePresence>
    <AnimatePresence>{editingAccount && <AccountEditDialog account={editingAccount} close={() => setEditingAccount(null)} />}</AnimatePresence>
  </div>
}

function AccountEditDialog({ account, close }) {
  const { notify } = useApp(); const [name, setName] = useState(account.name); const [error, setError] = useState('')
  return <SimpleDialog title="Editar cuenta" close={close}><form onSubmit={async (event) => { event.preventDefault(); if (name.trim().length < 2) { setError('Escribe un nombre de al menos dos caracteres.'); return } await db.accounts.update(account.id, { name: name.trim() }); notify('Cuenta actualizada'); close() }}><Field label="Nombre" error={error}><input value={name} onChange={(event) => setName(event.target.value)} /></Field><p className="helper">Cambiar el nombre no modifica saldos ni movimientos.</p><button className="button button--primary" type="submit">Guardar nombre</button></form></SimpleDialog>
}

function AccountDialog({ close }) {
  const { notify } = useApp(); const [name, setName] = useState(''); const [kind, setKind] = useState('asset'); const [amount, setAmount] = useState(''); const [error, setError] = useState('')
  return <SimpleDialog title="Agregar cuenta" close={close}><form onSubmit={async (event) => { event.preventDefault(); try { if (name.trim().length < 2) throw new Error('Escribe un nombre para la cuenta.'); const minor = amount.trim() ? parseLocalizedAmount(amount) : 0; const id = makeId('account'); await db.transaction('rw', db.accounts, db.transactions, async () => { await db.accounts.add({ id, name: name.trim(), kind, subtype: kind === 'liability' ? 'credit_card' : 'bank', currency: 'COP', archived: false }); if (minor) await db.transactions.add({ id: makeId('transaction'), type: 'opening', amount_minor: minor, currency: 'COP', occurred_at: `${today()}T12:00:00-05:00`, from_account_id: null, to_account_id: id, category_id: null, merchant_name: null, note: 'Saldo inicial', source: 'manual', status: 'recorded' }) }); notify('Cuenta creada'); close() } catch (issue) { setError(issue.message) } }}><Field label="Nombre"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Cuenta de ahorro" /></Field><Field label="Tipo"><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="asset">Dinero disponible</option><option value="liability">Tarjeta de crédito</option></select></Field><Field label={kind === 'asset' ? 'Saldo inicial' : 'Deuda inicial'} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></Field><p className="helper">El saldo inicial no cuenta como ingreso ni gasto.</p><button className="button button--primary" type="submit">Crear cuenta</button></form></SimpleDialog>
}

function SettingsPage() {
  const { settings, notify } = useApp()
  const navigate = useNavigate()
  const setSetting = (key, value) => db.settings.put({ key, value })
  return <div className="route-stack"><PageHeader title="Ajustes" subtitle="Preferencias de esta demo local." />
    <section className="settings-group"><h2>Apariencia</h2><SettingRow icon={settings.theme === 'dark' ? Moon : Sun} title="Tema" detail="Claro, noche o sistema"><select value={settings.theme || 'system'} onChange={(event) => setSetting('theme', event.target.value)}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Noche</option></select></SettingRow><SettingRow icon={settings.hiddenAmounts ? EyeOff : Eye} title="Ocultar montos" detail="Privacidad visual, no autenticación"><Switch checked={Boolean(settings.hiddenAmounts)} label="Ocultar montos" onChange={(value) => setSetting('hiddenAmounts', value)} /></SettingRow><SettingRow icon={Menu} title="Movimiento" detail="Respeta Reducir movimiento"><select value={settings.motion || 'system'} onChange={(event) => setSetting('motion', event.target.value)}><option value="system">Sistema</option><option value="soft">Suave</option><option value="off">Desactivado</option></select></SettingRow></section>
    <section className="settings-group"><h2>Integraciones</h2><SettingLink icon={Bell} title="Notificaciones" detail="Pendiente de configurar" to="/ajustes/notificaciones" /><SettingLink icon={Smartphone} title="Automatización" detail="Plantilla pendiente de publicar" to="/ajustes/automatizacion" /></section>
    <section className="settings-group"><h2>Datos de demostración</h2><SettingRow icon={CircleDollarSign} title="Moneda" detail="Una moneda activa en esta fase"><strong>COP</strong></SettingRow><button className="button button--danger" onClick={async () => { await resetDemo(); await db.settings.put({ key: 'entered', value: true }); notify('Datos de ejemplo restaurados'); navigate('/') }}>Restaurar datos de ejemplo</button></section>
  </div>
}

function SettingRow({ icon: Icon, title, detail, children }) { return <div className="setting-row"><span className="setting-row__icon"><Icon /></span><div><h3>{title}</h3><p>{detail}</p></div><div className="setting-row__control">{children}</div></div> }
function SettingLink({ icon, title, detail, to }) { return <Link className="setting-link" to={to}><SettingRow icon={icon} title={title} detail={detail}><ChevronRight /></SettingRow></Link> }
function Switch({ checked, onChange, label }) { return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button> }

function IntegrationsHeader({ title, subtitle }) { return <><Link className="back-link" to="/ajustes"><ChevronRight /> Ajustes</Link><PageHeader title={title} subtitle={subtitle} /></> }
function Notifications() {
  return <div className="route-stack"><IntegrationsHeader title="Notificaciones" subtitle="Avisos de PataWallet, no lectura de Wallet ni de bancos." /><section className="integration-card"><span className="integration-icon"><Bell /></span><p className="status-label">Pendiente de configurar</p><h2>Web Push aún no está activo</h2><p>Esta fase no tiene servidor, suscripción ni claves VAPID. Por eso no pediremos permiso ni fingiremos una prueba.</p><div className="honest-list"><p><Check /> Interfaz de preferencias preparada</p><p><CalendarDays /> Requiere PWA instalada y prueba en iPhone</p><p><Bell /> Mensajes privados por defecto, sin monto ni comercio</p></div><button className="button button--disabled" disabled>Activar notificaciones</button></section></div>
}
function Automation() {
  return <div className="route-stack"><IntegrationsHeader title="Automatización" subtitle="Captura compatible mediante Atajos, separada de esta PWA." /><section className="integration-card"><span className="integration-icon"><Smartphone /></span><p className="status-label">Plantilla pendiente de publicar</p><h2>La integración aún no está disponible</h2><p>No existe un enlace iCloud, backend ni vinculación real. La app no puede leer Wallet directamente.</p><ol className="steps"><li><span>1</span><div><strong>Añadir la plantilla</strong><p>Se habilitará cuando exista un enlace real y versionado.</p></div></li><li><span>2</span><div><strong>Vincular esta cuenta</strong><p>Usará un ticket temporal, nunca un token permanente en la URL.</p></div></li><li><span>3</span><div><strong>Crear la automatización personal</strong><p>Se completa en Atajos y requiere una tarjeta compatible.</p></div></li><li><span>4</span><div><strong>Validar una compra normal</strong><p>Una prueba de conexión no crea gastos ni demuestra una compra.</p></div></li></ol><button className="button button--disabled" disabled>Añadir atajo</button></section></div>
}

const movementSchema = z.object({ amount: z.string().min(1), account: z.string().min(1), destination: z.string().optional(), category: z.string().optional(), date: z.string().min(10) })
function MovementSheet({ transaction, onClose }) {
  const { accounts, categories, notify } = useApp()
  const editing = Boolean(transaction)
  const initialType = transaction?.type === 'card_payment' ? 'transfer' : transaction?.type || 'expense'
  const [type, setType] = useState(initialType)
  const assets = accounts.filter((item) => item.kind === 'asset' && !item.archived)
  const activeAccounts = accounts.filter((item) => !item.archived)
  const [amount, setAmount] = useState(transaction ? toInputAmount(transaction.amount_minor) : '')
  const [account, setAccount] = useState(transaction?.from_account_id || (type === 'income' ? '' : activeAccounts[0]?.id) || '')
  const [destination, setDestination] = useState(transaction?.to_account_id || assets[0]?.id || '')
  const [category, setCategory] = useState(transaction?.category_id || '')
  const [date, setDate] = useState(transaction?.occurred_at?.slice(0, 10) || today())
  const [note, setNote] = useState(transaction?.note || transaction?.merchant_name || '')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  useModalBehavior(dialogRef, onClose)
  const visibleCategories = categories.filter((item) => item.type === type)
  const deleteTransaction = async () => {
    if (!confirm('¿Eliminar este movimiento? Podrás deshacerlo durante unos segundos.')) return
    const backup = { ...transaction }
    await db.transactions.delete(transaction.id)
    notify('Movimiento eliminado', async () => { await db.transactions.put(backup); notify('Movimiento restaurado') })
    onClose()
  }
  const submit = async (event) => {
    event.preventDefault(); setError('')
    try {
      movementSchema.parse({ amount, account: type === 'income' ? destination : account, destination, category, date })
      const minor = parseLocalizedAmount(amount)
      if (type === 'transfer' && account === destination) throw new Error('Elige cuentas diferentes para la transferencia.')
      if ((type === 'expense' || type === 'income') && !category) throw new Error('Elige una categoría.')
      const destinationAccount = accounts.find((item) => item.id === destination)
      const storedType = type === 'transfer' && destinationAccount?.kind === 'liability' ? 'card_payment' : type
      const record = {
        id: transaction?.id || makeId('transaction'), type: storedType, amount_minor: minor, currency: 'COP',
        occurred_at: `${date}T12:00:00-05:00`, from_account_id: type === 'income' ? null : account,
        to_account_id: type === 'expense' ? null : destination, category_id: ['expense', 'income'].includes(type) ? category : null,
        merchant_name: note.trim() || null, note: note.trim(), source: transaction?.source || 'manual', status: 'recorded', updated_at: new Date().toISOString(),
      }
      await db.transactions.put(record)
      notify(editing ? 'Movimiento actualizado' : 'Movimiento guardado', !editing ? async () => { await db.transactions.delete(record.id); notify('Movimiento deshecho') } : null)
      onClose()
    } catch (issue) { setError(issue instanceof z.ZodError ? 'Completa los campos obligatorios.' : issue.message) }
  }
  return <motion.div className="sheet-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><motion.section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="movement-title" className="sheet" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}><header><div><p className="eyebrow">{editing ? 'Editar' : 'Registrar'}</p><h2 id="movement-title">{editing ? 'Detalle del movimiento' : 'Nuevo movimiento'}</h2></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button></header><form onSubmit={submit}>
    <div className="segmented" aria-label="Tipo de movimiento">{['expense', 'income', 'transfer'].map((item) => <button type="button" key={item} className={type === item ? 'active' : ''} onClick={() => { setType(item); setCategory(''); if (item === 'income') setDestination(assets[0]?.id || '') }}>{labelForType[item]}</button>)}</div>
    <Field label="Monto" error={error}><div className="amount-input"><span>$</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" aria-describedby={error ? 'movement-error' : undefined} /><small>COP</small></div></Field>
    {type !== 'income' && <Field label={type === 'transfer' ? 'Desde' : 'Cuenta'}><select value={account} onChange={(event) => setAccount(event.target.value)}>{(type === 'transfer' ? assets : activeAccounts).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
    {type !== 'expense' && <Field label={type === 'income' ? 'Recibir en' : 'Hacia'}><select value={destination} onChange={(event) => setDestination(event.target.value)}>{(type === 'income' ? assets : activeAccounts.filter((item) => item.id !== account)).map((item) => <option key={item.id} value={item.id}>{item.name}{item.kind === 'liability' ? ' (pago de tarjeta)' : ''}</option>)}</select></Field>}
    {type !== 'transfer' && <Field label="Categoría"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecciona una categoría</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
    <div className="form-grid"><Field label="Fecha"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Comercio o nota" optional><input value={note} onChange={(event) => setNote(event.target.value)} maxLength="120" placeholder="Opcional" /></Field></div>
    {type === 'transfer' && accounts.find((item) => item.id === destination)?.kind === 'liability' && <p className="info-note">Se guardará como pago de tarjeta. Reduce el activo y la deuda, sin crear otro gasto.</p>}
    <div className="sheet__actions">{editing && <button type="button" className="button button--danger" onClick={deleteTransaction}><Trash2 /> Eliminar</button>}<button className="button button--primary" type="submit">{editing ? 'Guardar cambios' : 'Guardar movimiento'}</button></div>
  </form></motion.section></motion.div>
}

function Field({ label, optional, error, children }) { return <label className="field"><span>{label}{optional && <small> Opcional</small>}</span>{children}{error && <em id="movement-error" role="alert">{error}</em>}</label> }
function SimpleDialog({ title, close, children }) { const modalRef = useRef(null); useModalBehavior(modalRef, close); return <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><motion.section ref={modalRef} tabIndex="-1" className="dialog" role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }}><header><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Cerrar"><X /></button></header>{children}</motion.section></motion.div> }
function Toast({ toast, close }) { return <motion.div className="toast" role="status" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}><span><Check /> {toast.message}</span>{toast.undo && <button onClick={async () => { await toast.undo(); close() }}><Undo2 /> Deshacer</button>}<button className="icon-button icon-button--small" aria-label="Cerrar aviso" onClick={close}><X /></button></motion.div> }
function LoadingScreen() { return <main className="loading" aria-label="Cargando PataWallet"><div className="skeleton skeleton--title" /><div className="skeleton skeleton--hero" /><div className="skeleton" /></main> }
function StateMessage({ illustration, title, body, action, actionLabel }) { return <section className="state-message">{illustration && <PetScene name={illustration} />}<h2>{title}</h2><p>{body}</p>{action && <button className="button button--primary" onClick={action}>{actionLabel}</button>}</section> }

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Coffee, CreditCard, Filter, PawPrint, ReceiptText, Search, ShoppingBasket, Sparkles, Wallet, Wifi, X } from 'lucide-react'
import { formatActivityMoney, sumActivity } from './activityData.js'

const typeLabels = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', card_payment: 'Pago de deuda' }
const iconByTone = { market: ShoppingBasket, coffee: Coffee, pets: PawPrint, home: Wifi, transport: ArrowUpRight, salary: ArrowDownLeft, transfer: ArrowLeftRight, debt: CreditCard }

// Comparte filtros legibles y accesibles entre las composiciones sin cambiar sus prioridades visuales.
export function ActivityFilters({ filters, setFilter, accounts, showPeriod = false }) {
  return <div className="activity-filters">
    {showPeriod && <div className="activity-period" role="group" aria-label="Periodo"><button type="button" aria-pressed={filters.period === 'today'} onClick={() => setFilter('period', filters.period === 'today' ? 'month' : 'today')}>Hoy</button><button type="button" aria-pressed={filters.period === 'week'} onClick={() => setFilter('period', filters.period === 'week' ? 'month' : 'week')}>7 días</button><button type="button" aria-pressed={filters.period === 'month'} onClick={() => setFilter('period', 'month')}>Este mes</button></div>}
    <label className="activity-search"><Search aria-hidden="true" /><span className="visually-hidden">Buscar en tus movimientos</span><input value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="Comercio, nota o categoría" /><kbd>Ctrl K</kbd></label>
    <label className="activity-account"><Wallet aria-hidden="true" /><span className="visually-hidden">Filtrar por cuenta</span><select value={filters.account} onChange={(event) => setFilter('account', event.target.value)}><option value="all">Todas las cuentas</option>{accounts.map((account) => <option key={account} value={account}>{account}</option>)}</select><ChevronDown aria-hidden="true" /></label>
  </div>
}

// Mantiene los chips de tipo en una sola línea desplazable para pantallas pequeñas.
export function ActivityTypeChips({ value, setValue, counts }) {
  const options = [['all', 'Todo'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Transferencias'], ['card_payment', 'Pagos de deuda']]
  return <div className="activity-type-chips" role="group" aria-label="Filtrar por tipo de movimiento">{options.map(([id, label]) => <button type="button" key={id} aria-pressed={value === id} onClick={() => setValue(id)}>{label}<span>{counts[id]}</span></button>)}</div>
}

// Permite cambiar entre dos periodos de datos ficticios y refleja el mes seleccionado en la interfaz.
export function ActivityMonth({ month, setMonth }) {
  const title = month === 'sep' ? 'Septiembre 2026' : 'Agosto 2026'
  return <div className="activity-month"><button type="button" aria-label="Ver mes anterior" onClick={() => setMonth(month === 'sep' ? 'ago' : 'sep')}><ChevronLeft aria-hidden="true" /></button><CalendarDays aria-hidden="true" /><span>{title}</span><button type="button" aria-label="Ver mes siguiente" onClick={() => setMonth(month === 'ago' ? 'sep' : 'ago')}><ChevronRight aria-hidden="true" /></button></div>
}

// Abre el detalle de un movimiento con su tipo, cuenta, fecha y nota de ejemplo.
export function ActivityRow({ item, hidden, onOpen, compact = false }) {
  const Icon = iconByTone[item.tone] || ReceiptText
  const positive = item.type === 'income'
  const sign = positive ? '+' : item.type === 'transfer' ? '↔' : '−'
  return <button type="button" className={`activity-row ${compact ? 'activity-row--compact' : ''}`} onClick={() => onOpen(item)}>
    <span className={`activity-row__icon activity-row__icon--${item.tone}`}><Icon aria-hidden="true" /></span>
    <span className="activity-row__main"><strong>{item.name}</strong><small>{item.category}<i aria-hidden="true">·</i>{item.account}</small>{!compact && <small className="activity-row__note">{item.date}</small>}</span>
    <span className={`activity-row__value ${positive ? 'is-positive' : ''}`}><strong>{sign} {formatActivityMoney(item.amountMinor, hidden)}</strong><small>{compact ? item.date : typeLabels[item.type]}</small></span>
    <ChevronRight className="activity-row__chevron" aria-hidden="true" />
  </button>
}

// Agrupa la actividad por día para dar contexto temporal en las vistas de cronología y exploración.
export function GroupedActivity({ transactions, hidden, onOpen }) {
  const groups = transactions.reduce((result, item) => {
    const group = result.find((entry) => entry.label === item.day)
    if (group) group.items.push(item)
    else result.push({ label: item.day, items: [item] })
    return result
  }, [])
  if (!groups.length) return <ActivityEmpty />
  return <div className="activity-groups">{groups.map((group) => <section className="activity-day" key={group.label}><header><h3>{group.label}</h3><span>{group.items.length} {group.items.length === 1 ? 'movimiento' : 'movimientos'}</span></header><div>{group.items.map((item) => <ActivityRow key={item.id} item={item} hidden={hidden} onOpen={onOpen} />)}</div></section>)}</div>
}

// Explica los resultados vacíos con una acción útil que elimina solo el filtro de búsqueda.
export function ActivityEmpty({ onClear }) {
  return <div className="activity-empty"><span><CircleHelp aria-hidden="true" /></span><h3>No encontramos movimientos</h3><p>Prueba otro periodo o ajusta los filtros para ver más actividad.</p>{onClear && <button type="button" onClick={onClear}>Limpiar búsqueda</button>}</div>
}

// Ordena la pantalla primero por fechas, con un resumen compacto y navegación mensual.
export function ActivityTimeline({ transactions, allTransactions, filters, setFilter, setMonth, onClearFilters, accounts, hidden, onOpen }) {
  const monthTransactions = allTransactions.filter((item) => item.month === filters.month)
  const expenses = sumActivity(monthTransactions, 'expense')
  const incomes = sumActivity(monthTransactions, 'income')
  const spentInMonth = expenses
  const budgetMinor = 1_200_000_00
  const progress = Math.min(100, Math.round((spentInMonth / budgetMinor) * 100))
  const budgetMessage = spentInMonth > budgetMinor ? 'Sobre presupuesto' : 'Dentro del plan'
  const counts = Object.fromEntries([['all', transactions.length], ...['expense', 'income', 'transfer', 'card_payment'].map((type) => [type, transactions.filter((item) => item.type === type).length])])
  return <div className="activity-layout activity-layout--timeline">
    <header className="activity-heading"><div><p className="activity-kicker">TU DINERO, DÍA A DÍA</p><h1>Actividad</h1><p>Todo lo que entra y sale, en un mismo lugar.</p></div><span className="activity-data-badge"><i /> Datos de ejemplo</span></header>
    <div className="activity-toolbar"><ActivityMonth month={filters.month} setMonth={setMonth} /><button type="button" className="activity-toolbar-action" onClick={onClearFilters}><Filter aria-hidden="true" />Limpiar filtros</button></div>
    <section className="activity-timeline-summary"><div className="activity-summary-top"><span>GASTOS DEL MES</span><span className="activity-summary-trend"><ArrowUpRight aria-hidden="true" /> {budgetMessage}</span></div><strong>{formatActivityMoney(expenses, hidden)}</strong><div className="activity-summary-footer"><span><i className="income-dot" /> Entró <b>{formatActivityMoney(incomes, hidden)}</b></span><span>{monthTransactions.length} movimientos</span></div><div className="activity-summary-track" role="progressbar" aria-label={`${progress}% de un presupuesto de ejemplo de $1.200.000`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></section>
    <ActivityFilters filters={filters} setFilter={setFilter} accounts={accounts} />
    <ActivityTypeChips value={filters.type} setValue={(value) => setFilter('type', value)} counts={counts} />
    <section className="activity-list-panel"><div className="activity-panel-heading"><div><h2>Movimientos recientes</h2><p>Ordenados del más nuevo al más antiguo</p></div><span className="activity-count">{transactions.length}</span></div><GroupedActivity transactions={transactions} hidden={hidden} onOpen={onOpen} /></section>
    <p className="activity-footnote"><Sparkles aria-hidden="true" /> Revisar también es una forma de cuidar tus planes.</p>
  </div>
}

// Prioriza las categorías con un gráfico proporcional que también funciona como filtro de actividad.
export function ActivityCategories({ transactions, filters, setFilter, setMonth, accounts, hidden, onOpen }) {
  const expenses = transactions.filter((item) => item.type === 'expense')
  const totals = expenses.reduce((result, item) => result.set(item.category, (result.get(item.category) || 0) + item.amountMinor), new Map())
  const totalExpense = sumActivity(expenses, 'expense')
  const colors = ['#e8a4c7', '#f2bd89', '#b8a4ff', '#83c7e4', '#9bd8bf', '#f1d08f']
  const categories = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, amount], index) => ({ name, amount, color: colors[index % colors.length], percent: totalExpense ? Math.round(amount / totalExpense * 100) : 0 }))
  const segments = categories.reduce((result, item, index) => {
    const end = index === categories.length - 1 ? 100 : result.cursor + item.amount / totalExpense * 100
    return { cursor: end, values: [...result.values, `${item.color} ${result.cursor}% ${end}%`] }
  }, { cursor: 0, values: [] }).values.join(', ')
  const filteredByCategory = filters.category !== 'all' ? transactions.filter((item) => item.category === filters.category) : []
  const daysElapsed = filters.month === 'sep' ? 23 : 31
  const counts = { all: transactions.length, expense: expenses.length, income: transactions.filter((item) => item.type === 'income').length, transfer: transactions.filter((item) => item.type === 'transfer').length, card_payment: transactions.filter((item) => item.type === 'card_payment').length }
  return <div className="activity-layout activity-layout--categories">
    <header className="activity-heading"><div><p className="activity-kicker">UNA MIRADA A TUS HÁBITOS</p><h1>¿En qué se va?</h1><p>Entiende tus gastos sin perder de vista el contexto.</p></div><span className="activity-data-badge"><i aria-hidden="true" /> Datos de ejemplo</span></header>
    <div className="activity-toolbar"><ActivityMonth month={filters.month} setMonth={setMonth} /><span className="category-insight"><Sparkles aria-hidden="true" /> Tus gastos, sin juicios</span></div>
    <section className="category-hero">
      <div className="category-hero__heading"><div><span>GASTOS DEL MES</span><h2>{formatActivityMoney(totalExpense, hidden)}</h2></div><span className="category-hero__icon"><ShoppingBasket aria-hidden="true" /></span></div>
      <div className="category-visual">
        <div className="category-donut" style={{ '--donut-segments': segments || '#29374e 0% 100%' }} role="img" aria-label="Gráfico de gastos por categoría"><div><span>{categories.length}</span><small>categorías</small></div></div>
        <div className="category-legend">{categories.slice(0, 5).map((category) => <button type="button" key={category.name} className={filters.category === category.name ? 'is-selected' : ''} onClick={() => setFilter('category', filters.category === category.name ? 'all' : category.name)}><i style={{ '--category-color': category.color }} /><span>{category.name}<small>{category.percent}%</small></span><strong>{formatActivityMoney(category.amount, hidden)}</strong></button>)}</div>
      </div>
      <div className="category-total-note"><span><span className="activity-dot" /> {transactions.length} movimientos revisados</span><span>Promedio diario <b>{formatActivityMoney(Math.round(totalExpense / daysElapsed), hidden)}</b></span></div>
    </section>
    <div className="category-filter-bar"><ActivityTypeChips value={filters.type} setValue={(value) => setFilter('type', value)} counts={counts} /><ActivityFilters filters={filters} setFilter={setFilter} accounts={accounts} /></div>
    <section className="activity-list-panel"><div className="activity-panel-heading"><div><h2>{filters.category === 'all' ? 'Movimientos del periodo' : filters.category}</h2><p>{filters.category !== 'all' ? 'Toca una categoría otra vez para quitar el filtro.' : 'Cada movimiento tiene su historia.'}</p></div>{filters.category !== 'all' && <button type="button" className="clear-category" onClick={() => setFilter('category', 'all')} aria-label="Quitar filtro de categoría"><X aria-hidden="true" /></button>}</div><GroupedActivity transactions={filters.category !== 'all' ? filteredByCategory : transactions} hidden={hidden} onOpen={onOpen} /></section>
  </div>
}

// Convierte Actividad en un espacio de consulta y filtros, con controles de periodo siempre visibles.
export function ActivityExplorer({ transactions, filters, setFilter, setMonth, accounts, hidden, onOpen }) {
  const counts = { all: transactions.length, expense: transactions.filter((item) => item.type === 'expense').length, income: transactions.filter((item) => item.type === 'income').length, transfer: transactions.filter((item) => item.type === 'transfer').length, card_payment: transactions.filter((item) => item.type === 'card_payment').length }
  const expenseTotal = sumActivity(transactions, 'expense')
  return <div className="activity-layout activity-layout--explorer">
    <header className="activity-heading"><div><p className="activity-kicker">BUSCA Y ENCUENTRA</p><h1>Tu actividad</h1><p>Encuentra un detalle, revisa una cuenta o vuelve a un día.</p></div><span className="activity-data-badge"><i /> Datos de ejemplo</span></header>
    <section className="explorer-controls"><div className="explorer-controls__top"><div><span className="activity-kicker">FILTROS</span><h2>¿Qué quieres revisar?</h2></div><span className="explorer-filter-icon"><Filter aria-hidden="true" /></span></div><ActivityFilters filters={filters} setFilter={setFilter} accounts={accounts} showPeriod /><div className="explorer-month"><ActivityMonth month={filters.month} setMonth={setMonth} /><button type="button" className="reset-filters" onClick={() => { setFilter('query', ''); setFilter('type', 'all'); setFilter('account', 'all'); setFilter('category', 'all'); setFilter('period', 'month') }}>Limpiar todo</button></div><ActivityTypeChips value={filters.type} setValue={(value) => setFilter('type', value)} counts={counts} /></section>
    <section className="explorer-overview"><div><span>VISTA ACTUAL</span><strong>{transactions.length} <small>{transactions.length === 1 ? 'movimiento' : 'movimientos'}</small></strong></div><span className="explorer-overview__divider" /><div><span>GASTOS EN ESTA VISTA</span><strong>{formatActivityMoney(expenseTotal, hidden)}</strong></div><button type="button" onClick={() => setFilter('type', filters.type === 'expense' ? 'all' : 'expense')} aria-label="Alternar filtro de gastos"><ArrowUpRight aria-hidden="true" /></button></section>
    <section className="activity-list-panel explorer-results"><div className="activity-panel-heading"><div><h2>Resultados</h2><p>Selecciona un movimiento para ver su detalle.</p></div><span className="activity-count">{transactions.length}</span></div><GroupedActivity transactions={transactions} hidden={hidden} onOpen={onOpen} /></section>
    <div className="explorer-note"><span><Check aria-hidden="true" /></span><p>Los movimientos son ficticios.<br /><small>Ninguna acción modifica tus datos reales.</small></p><button type="button" aria-label="Más información sobre esta vista previa" title="Todos los cambios de esta exploración viven solo en memoria"><CircleHelp aria-hidden="true" /></button></div>
  </div>
}

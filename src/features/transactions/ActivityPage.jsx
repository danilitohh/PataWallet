import { useMemo, useState } from 'react'
import { PawPrint, Search } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { calculateSummary, monthInTimeZone } from '../../domain/finance.js'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { StateMessage } from '../../shared/components/Feedback.jsx'
import { ShortcutReviewList } from '../integrations/components/ShortcutReviewList.jsx'
import { useShortcutIntegration } from '../integrations/hooks/useShortcutIntegration.js'
import { ActivityMonthSummary } from './components/ActivityMonthSummary.jsx'
import { ActivityMonthToolbar } from './components/ActivityMonthToolbar.jsx'
import { ActivityTypeFilters } from './components/ActivityTypeFilters.jsx'
import { TransactionList } from './components/TransactionList.jsx'
import { currentMonth } from '../../shared/lib/date.js'
import { initialActivityMonth } from './model/activityTimeline.js'

// Aperturas y ajustes cambian saldos, pero no son movimientos cotidianos del historial.
const NON_ACTIVITY_TYPES = new Set(['opening', 'adjustment'])

// Presenta el mes seleccionado como cronología real y conserva búsqueda, cuenta y revisión de movimientos.
export function ActivityPage() {
  const { transactions, accounts, categories, isDemo, notify, setSheet, settings } = useApp()
  const shortcut = useShortcutIntegration(isDemo)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [account, setAccount] = useState('all')
  const [month, setMonth] = useState(initialActivityMonth)
  const review = useMemo(() => shortcut.events.filter((item) => ['recorded_needs_category', 'needs_review', 'duplicate', 'conflict'].includes(item.result_status) && !item.resolved_at), [shortcut.events])
  const showingReview = type === 'review'
  const current = currentMonth()
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const searchTerm = query.trim().toLocaleLowerCase('es-CO')

  // Derives period totals and filter counts from persisted movements; opening balances never enter the timeline.
  const monthItems = useMemo(() => transactions.filter((item) => (
    item.status !== 'void'
    && !NON_ACTIVITY_TYPES.has(item.type)
    && monthInTimeZone(item.occurred_at) === month
  )), [transactions, month])
  const matchingItems = useMemo(() => monthItems.filter((item) => {
    const text = `${item.merchant_name || ''} ${item.note || ''} ${categoryNames.get(item.category_id) || ''}`.toLocaleLowerCase('es-CO')
    const accountMatches = account === 'all' || item.from_account_id === account || item.to_account_id === account
    return accountMatches && text.includes(searchTerm)
  }), [account, categoryNames, monthItems, searchTerm])
  const counts = useMemo(() => matchingItems.reduce((result, item) => {
    result.all += 1
    if (Object.prototype.hasOwnProperty.call(result, item.type)) result[item.type] += 1
    return result
  }, { all: 0, expense: 0, income: 0, transfer: 0, card_payment: 0 }), [matchingItems])
  const items = useMemo(() => matchingItems
    .filter((item) => type === 'all' || item.type === type)
    .sort((left, right) => new Date(right.occurred_at) - new Date(left.occurred_at)), [matchingItems, type])
  const summary = useMemo(() => calculateSummary(accounts, transactions, month), [accounts, month, transactions])
  const hasFilters = Boolean(searchTerm) || type !== 'all' || account !== 'all'

  // Resets only search and transaction filters, leaving the chosen month in place.
  const clearFilters = () => {
    setQuery('')
    setType('all')
    setAccount('all')
  }

  return (
    <div className="route-stack activity-page">
      <PageHeader
        title="Actividad"
        subtitle="Todo lo que entra y sale, en un mismo lugar."
        action={isDemo && <span className="activity-data-badge"><i aria-hidden="true" />Datos de ejemplo</span>}
      />
      <ActivityMonthToolbar month={month} current={current} onMonthChange={setMonth} onClearFilters={clearFilters} hasFilters={hasFilters} />
      <ActivityMonthSummary
        month={month}
        expenses={summary.expenses}
        income={summary.income}
        count={monthItems.length}
        currency={settings.currency || 'COP'}
        hidden={settings.hiddenAmounts}
      />
      <section className="activity-filter-panel" aria-label="Buscar y filtrar movimientos">
        <div className="search-box activity-search-box">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="activity-search">Buscar movimientos</label>
          <input id="activity-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Comercio, nota o categoría" />
        </div>
        <div className="filters activity-account-filter">
          <label className="sr-only" htmlFor="activity-account">Filtrar por cuenta</label>
          <select id="activity-account" value={account} onChange={(event) => setAccount(event.target.value)}>
            <option value="all">Todas las cuentas</option>
            {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <ActivityTypeFilters value={type} counts={counts} reviewCount={review.length} showReview={!isDemo} onChange={setType} />
      </section>
      <section className="activity-list-panel" aria-labelledby="activity-list-title">
        <div className="activity-panel-heading">
          <div><h2 id="activity-list-title">Movimientos recientes</h2><p>Ordenados del más nuevo al más antiguo</p></div>
          <span className="activity-count" aria-label={`${showingReview ? review.length : items.length} resultados`}>{showingReview ? review.length : items.length}</span>
        </div>
        {showingReview
          ? <ShortcutReviewList items={review} accounts={accounts} categories={categories} transactions={transactions} onResolve={shortcut.resolve} notify={notify} />
          : items.length
            ? <TransactionList items={items} grouped />
            : <StateMessage illustration="empty" title="No encontramos movimientos" body="Prueba otro mes o ajusta los filtros para ver más actividad." actionLabel="Agregar movimiento" action={() => setSheet('new')} />}
      </section>
      <p className="activity-footnote"><PawPrint aria-hidden="true" /> Revisa tu actividad con calma: los datos y los totales se actualizan con tus movimientos registrados.</p>
    </div>
  )
}

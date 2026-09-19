import { useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { StateMessage } from '../../shared/components/Feedback.jsx'
import { TransactionList } from './components/TransactionList.jsx'
import { ShortcutReviewList } from '../integrations/components/ShortcutReviewList.jsx'
import { useShortcutIntegration } from '../integrations/hooks/useShortcutIntegration.js'

// Combina búsqueda, chips de tipo y cuenta sin alterar los movimientos guardados.
export function ActivityPage() {
  const { transactions, accounts, categories, isDemo, notify, setSheet } = useApp()
  const shortcut = useShortcutIntegration(isDemo)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [account, setAccount] = useState('all')
  const items = transactions.filter((item) => {
    const text = `${item.merchant_name || ''} ${item.note || ''} ${categories.find((category) => category.id === item.category_id)?.name || ''}`.toLowerCase()
    const accountMatches = account === 'all' || item.from_account_id === account || item.to_account_id === account
    return !['opening', 'adjustment'].includes(item.type) && text.includes(query.toLowerCase()) && (type === 'all' || type === 'review' || item.type === type) && accountMatches
  })
  const review = shortcut.events.filter((item) => ['recorded_needs_category', 'needs_review', 'duplicate', 'conflict'].includes(item.result_status) && !item.resolved_at)
  const showingReview = type === 'review'

  return (
    <div className="route-stack">
      <PageHeader title="Actividad" subtitle={showingReview ? `${review.length} eventos por revisar` : `${items.length} movimientos visibles`} />
      <div className="search-box"><Search /><label className="sr-only" htmlFor="search">Buscar movimientos</label><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por comercio, nota o categoría" /></div>
      {/* Todos los tipos permanecen accesibles mediante desplazamiento horizontal, sin filtros duplicados. */}
      <div className="activity-type-chips" aria-label="Tipos de movimiento">{[['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['transfer', 'Transferencias'], ['card_payment', 'Pagos de deuda'], ...(!isDemo ? [['review', 'Por revisar']] : [])].map(([value, label]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => setType(value)}>{label}</button>)}</div>
      <div className="filters" aria-label="Filtros de movimientos">
        <select value={account} onChange={(event) => setAccount(event.target.value)} aria-label="Filtrar por cuenta"><option value="all">Todas las cuentas</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
      {showingReview ? <ShortcutReviewList items={review} accounts={accounts} categories={categories} transactions={transactions} onResolve={shortcut.resolve} notify={notify} /> : items.length ? <TransactionList items={items} grouped /> : <StateMessage illustration="empty" title="No encontramos movimientos" body="Prueba otros filtros o registra un nuevo movimiento." actionLabel="Agregar movimiento" action={() => setSheet('new')} />}
    </div>
  )
}

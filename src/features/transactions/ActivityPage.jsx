import { useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { PageHeader } from '../../shared/components/PageHeader.jsx'
import { StateMessage } from '../../shared/components/Feedback.jsx'
import { TransactionList } from './components/TransactionList.jsx'

export function ActivityPage() {
  const { transactions, accounts, categories } = useApp()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [account, setAccount] = useState('all')
  const items = transactions.filter((item) => {
    const text = `${item.merchant_name || ''} ${item.note || ''} ${categories.find((category) => category.id === item.category_id)?.name || ''}`.toLowerCase()
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

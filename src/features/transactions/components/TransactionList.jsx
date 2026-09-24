import { BriefcaseBusiness, BusFront, ChevronRight, CircleDollarSign, PawPrint, ShoppingBasket, Utensils } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { formatMinor } from '../../../domain/money.js'
import { NightIcon } from '../../../shared/components/NightIcon.jsx'
import { today } from '../../../shared/lib/date.js'
import { iconForType, labelForType } from '../model/transactionTypes.js'

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
  const date = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }).format(new Date(value))
  if (date === today()) return 'Hoy'
  const label = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date(`${date}T12:00:00-05:00`))
  return label.charAt(0).toLocaleUpperCase('es-CO') + label.slice(1)
}

export function TransactionList({ items, compact = false, grouped = false }) {
  const { accounts, categories, setSheet, settings } = useApp()
  const renderItem = (item) => {
    const category = categories.find((candidate) => candidate.id === item.category_id)
    const { Icon, tone } = categoryPresentation(category, item.type)
    const account = accounts.find((candidate) => candidate.id === (item.from_account_id || item.to_account_id))
    const expense = item.type === 'expense'
    const income = item.type === 'income' || item.type === 'refund'

    const clockDate = new Date(item.occurred_at)
    const clock = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(clockDate)
    const hasExplicitTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }).format(clockDate) !== '12:00'
    return (
      <button className="transaction" key={item.id} onClick={() => setSheet(item)}>
        <NightIcon icon={Icon} className={`transaction__icon tone-${tone}`} tone={tone} />
        <span className="transaction__main"><strong>{item.merchant_name || labelForType[item.type]}{item.source === 'shortcut' && <span className="source-badge">Automático · Atajos</span>}</strong><small>{category?.name || labelForType[item.type]}{account ? ` · ${account.name}` : ''}</small></span>
        <span className={`transaction__amount ${income ? 'positive' : expense ? 'negative' : ''}`}><strong>{income ? '+' : expense ? '-' : ''}{formatMinor(item.amount_minor, item.currency, settings.hiddenAmounts)}</strong><small>{new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(new Date(item.occurred_at))}{hasExplicitTime ? ` · ${clock}` : ''}</small></span>
        <ChevronRight className="transaction__chevron" />
      </button>
    )
  }

  if (!grouped) return <div className={`transaction-list ${compact ? 'compact' : ''}`}>{items.map(renderItem)}</div>

  const groups = items.reduce((result, item) => {
    const date = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' }).format(new Date(item.occurred_at))
    if (!result[date]) result[date] = []
    result[date].push(item)
    return result
  }, {})

  return <div className="activity-groups">{Object.entries(groups).map(([date, group]) => <section className="transaction-group" key={date}><h2>{transactionDateLabel(group[0].occurred_at)}</h2><div className="transaction-list">{group.map(renderItem)}</div></section>)}</div>
}

import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatMinor } from '../../../domain/money.js'

const labels = { card_not_mapped: 'Tarjeta sin cuenta asignada', amount_missing_or_ambiguous: 'Monto ausente o ambiguo', currency_missing_or_unsupported: 'Moneda ausente o no compatible', date_missing_or_invalid: 'Fecha ausente o inválida', merchant_missing: 'Comercio ausente', possible_duplicate: 'Posible duplicado', category_missing: 'Falta elegir categoría' }
const datetimeLocal = (value) => value ? new Date(value).toISOString().slice(0, 16) : ''

export function ShortcutReviewList({ items, accounts, categories, transactions, onResolve, notify }) {
  const [editing, setEditing] = useState(null)
  if (!items.length) return <div className="empty-inline"><CheckCircle2 /> No hay eventos pendientes.</div>
  return <div className="review-list">{items.map((item) => <article className="review-card" key={item.id}>
    <div className="review-card__head"><span className="integration-icon"><AlertTriangle /></span><div><strong>{item.merchant_name || 'Compra sin comercio'}</strong><p>{item.amount_minor ? formatMinor(item.amount_minor, item.currency || 'COP', false) : 'Monto por confirmar'} · {item.card_alias || 'Tarjeta no informada'}</p></div><span className="status-label">{item.result_status === 'duplicate' ? 'Posible duplicado' : 'Por revisar'}</span></div>
    <p>{item.review_reasons.map((reason) => labels[reason] || reason).join(' · ')}</p><button className="button button--secondary" onClick={() => setEditing(item)}>Revisar ahora</button>
    {editing?.id === item.id && <ReviewForm item={item} accounts={accounts} categories={categories} transactions={transactions} close={() => setEditing(null)} onResolve={onResolve} notify={notify} />}
  </article>)}</div>
}

function ReviewForm({ item, accounts, categories, transactions, close, onResolve, notify }) {
  const categorizing = item.result_status === 'recorded_needs_category'
  const [action, setAction] = useState(item.result_status === 'duplicate' ? 'associate' : categorizing ? 'categorize' : 'record')
  const [accountId, setAccountId] = useState(accounts.find((account) => !account.archived)?.id || '')
  const [categoryId, setCategoryId] = useState(categories.find((category) => category.type === 'expense' && category.name !== 'Sin categoría')?.id || '')
  const [amount, setAmount] = useState(item.amount_minor ? String(item.amount_minor) : '')
  const [occurredAt, setOccurredAt] = useState(datetimeLocal(item.occurred_at))
  const [transactionId, setTransactionId] = useState('')
  const [createRule, setCreateRule] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      await onResolve(item.id, { expected_version: item.version, action, account_id: action === 'record' ? accountId : undefined, category_id: action === 'associate' ? undefined : categoryId, amount_minor: action === 'record' ? amount : undefined, occurred_at: action === 'record' ? new Date(occurredAt).toISOString() : undefined, transaction_id: action === 'associate' ? transactionId : undefined, create_rule: createRule })
      notify('Evento resuelto sin duplicar movimientos'); close()
    } catch (error) { notify(error.message) } finally { setBusy(false) }
  }
  return <form className="review-form" onSubmit={submit}>
    {item.result_status === 'duplicate' && <label className="field"><span>Decisión</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="associate">Vincular a un movimiento existente</option><option value="record">Registrar como compra diferente</option></select></label>}
    {action === 'associate' ? <label className="field"><span>Movimiento existente</span><select value={transactionId} onChange={(event) => setTransactionId(event.target.value)} required><option value="">Selecciona…</option>{transactions.filter((transaction) => transaction.status === 'recorded').map((transaction) => <option key={transaction.id} value={transaction.id}>{transaction.merchant_name || transaction.note || transaction.type}</option>)}</select></label> : <>
      {action === 'record' && <><label className="field"><span>Monto en centavos COP</span><input inputMode="numeric" pattern="[1-9][0-9]{0,11}" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><label className="field"><span>Fecha y hora</span><input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required /></label><label className="field"><span>Cuenta</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)} required>{accounts.filter((account) => !account.archived).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></>}
      <label className="field"><span>Categoría</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>{categories.filter((category) => category.type === 'expense' && category.name !== 'Sin categoría').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      {item.merchant_name && <label className="check-row"><input type="checkbox" checked={createRule} onChange={(event) => setCreateRule(event.target.checked)} /> Usar esta categoría para futuras coincidencias exactas</label>}
    </>}
    <div className="notification-actions"><button type="button" className="button button--secondary" onClick={close}>Cancelar</button><button className="button button--primary" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar'}</button></div>
  </form>
}

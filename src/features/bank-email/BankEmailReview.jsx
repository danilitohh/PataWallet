import { useState } from 'react'
import { Plus } from 'lucide-react'
import { formatMinor, parseLocalizedAmount, toInputAmount } from '../../domain/money.js'
import { CategoryDialog } from '../../shared/components/CategoryDialog.jsx'

const TYPES = { expense: 'Gasto', income: 'Ingreso', transfer: 'Entre mis cuentas', card_payment: 'Pago de deuda', refund: 'Reembolso' }
const TYPES_BY_DIRECTION = {
  incoming: ['income', 'transfer', 'refund'],
  outgoing: ['expense', 'transfer', 'card_payment'],
}

// Formulario explícito: el nombre del banco o destinatario nunca elige cuenta ni tipo por sí solo.
export function BankEmailReview({ item, accounts, categories, transactions, hidden, resolve }) {
  const candidate = item.candidate
  const [action, setAction] = useState('')
  const [type, setType] = useState(candidate.direction === 'incoming' ? 'income' : '')
  const [amount, setAmount] = useState(candidate.amount_minor ? toInputAmount(candidate.amount_minor) : '')
  const [date, setDate] = useState(candidate.occurred_at ? new Date(Date.parse(candidate.occurred_at) - 5 * 3600000).toISOString().slice(0, 16) : '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [transaction, setTransaction] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [distinct, setDistinct] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const categoryType = type === 'income' ? 'income' : 'expense'
  const needsCategory = ['expense', 'income', 'refund'].includes(type)
  const needsFrom = ['expense', 'transfer', 'card_payment'].includes(type)
  const needsTo = ['income', 'transfer', 'card_payment', 'refund'].includes(type)
  const activeAccounts = accounts.filter((account) => !account.archived)
  const allowedTypes = TYPES_BY_DIRECTION[candidate.direction] || Object.keys(TYPES)
  const typeOptions = Object.entries(TYPES).filter(([key]) => allowedTypes.includes(key))

  // Una alerta entrante propone ingreso, pero las transferencias propias siguen disponibles.
  const categoryCreated = (id) => { setCategory(id); setError('') }

  // Conserva campos tras cualquier error; se refrescan saldos solo después de confirmación del servidor.
  const submit = async (event) => {
    event.preventDefault()
    if (busy || !confirmed) return
    setBusy(true); setError('')
    try {
      const payload = action === 'record' ? {
        type, amount_minor: parseLocalizedAmount(amount), currency: 'COP', occurred_at: new Date(`${date}:00-05:00`).toISOString(),
        from_account_id: needsFrom ? from : null, to_account_id: needsTo ? to : null,
        category_id: needsCategory ? category : null, merchant_name: candidate.counterparty?.slice(0, 120) || null,
        note: 'Confirmado desde correo bancario',
      } : {}
      await resolve(item.id, action, payload, action === 'link' ? transaction : null, distinct)
    } catch (issue) { setError(issue.message) } finally { setBusy(false) }
  }
  return <>
  <form className="review-form bank-email-review" onSubmit={submit}>
    <p>El correo no certifica por sí solo el movimiento. Compruébalo en tu banco antes de confirmar. Nunca introduzcas claves ni números completos de cuenta.</p>
    <label className="field"><span>Qué hacer con este correo</span><select required value={action} onChange={(event) => { setAction(event.target.value); setConfirmed(false) }}><option value="">Selecciona…</option><option value="record">Registrar un movimiento</option><option value="link">Ya existe: vincular sin duplicar</option><option value="dismiss">Descartar: no afecta mis saldos</option></select></label>
    {action === 'record' && <>
      <label className="field"><span>Tipo de movimiento</span><select required value={type} onChange={(event) => { setType(event.target.value); setFrom(''); setTo(''); setCategory('') }}><option value="">Selecciona…</option>{typeOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {type === 'transfer' && <p>Sale de una cuenta tuya y entra en otra. No suma gastos ni ingresos.</p>}
      {type === 'income' && <p className="info-note">Registra aquí el dinero que recibiste. Si luego lo usas para abonar una deuda, registra ese pago por separado desde Cuentas.</p>}
      {hidden ? <p role="status">Desactiva «Ocultar montos» en Ajustes para revisar y registrar el importe.</p> : <label className="field"><span>Monto confirmado en COP</span><input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>}
      <label className="field"><span>Fecha y hora de Colombia</span><input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      {needsFrom && <AccountSelect label="Cuenta de origen" value={from} setValue={setFrom} accounts={activeAccounts.filter((account) => type === 'expense' || account.kind === 'asset')} />}
      {needsTo && <AccountSelect label="Cuenta de destino" value={to} setValue={setTo} accounts={activeAccounts.filter((account) => account.id !== from && (type === 'refund' || account.kind === (type === 'card_payment' ? 'liability' : 'asset')))} />}
      {needsCategory && <div className="field"><span>Categoría</span><div className="input-with-action"><select aria-label="Categoría" required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecciona…</option>{categories.filter((entry) => entry.type === categoryType).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><button type="button" className="icon-button" aria-label="Crear categoría" disabled={busy} onClick={() => setAddingCategory(true)}><Plus aria-hidden="true" /></button></div></div>}
      <label className="check-row"><input type="checkbox" checked={distinct} onChange={(event) => setDistinct(event.target.checked)} /> Si hay otro movimiento similar, confirmo que este es distinto.</label>
    </>}
    {action === 'link' && <label className="field"><span>Movimiento ya registrado</span><select required value={transaction} onChange={(event) => setTransaction(event.target.value)}><option value="">Selecciona…</option>{transactions.filter((entry) => entry.status === 'recorded').map((entry) => <option key={entry.id} value={entry.id}>{entry.occurred_at.slice(0, 10)} · {entry.merchant_name || TYPES[entry.type] || entry.type} · {formatMinor(entry.amount_minor, 'COP', hidden)}</option>)}</select></label>}
    {action && <label className="check-row"><input required type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Revisé el movimiento y confirmo esta decisión.</label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button--primary" disabled={busy || !action || !confirmed || (action === 'record' && hidden)}>{busy ? 'Confirmando…' : 'Confirmar decisión'}</button>
  </form>
  {addingCategory && <CategoryDialog type={categoryType} close={() => setAddingCategory(false)} onCreated={categoryCreated} />}
  </>
}

// Selector nativo con opción vacía: no preselecciona una cuenta de otro banco accidentalmente.
function AccountSelect({ label, value, setValue, accounts }) {
  return <label className="field"><span>{label}</span><select required value={value} onChange={(event) => setValue(event.target.value)}><option value="">Selecciona…</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
}

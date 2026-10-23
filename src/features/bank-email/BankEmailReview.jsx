import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, Check, CreditCard, Ellipsis, Plus, RotateCcw, ShieldCheck, ShoppingBag } from 'lucide-react'
import { formatMinor, parseLocalizedAmount, toInputAmount } from '../../domain/money.js'
import { readFixedExpenses } from '../../domain/financialSetup.js'
import { normalizeMerchantName, suggestMerchantCategory } from '../../domain/merchantCategory.js'
import { addCalendarDays, calendarToday, getRecurringExpenseOccurrences } from '../../domain/recurringExpenses.js'
import { CategoryDialog } from '../../shared/components/CategoryDialog.jsx'
import './bank-email.css'

const TYPES = { expense: 'Gasto', income: 'Ingreso', transfer: 'Entre mis cuentas', card_payment: 'Pago de deuda', refund: 'Reembolso' }
const INTENTS = {
  expense: { title: 'Gasto', description: 'Compra o consumo', icon: ShoppingBag },
  income: { title: 'Ingreso', description: 'Dinero recibido', icon: ArrowDownLeft },
  transfer: { title: 'Transferencia', description: 'Entre cuentas propias', icon: ArrowLeftRight },
  card_payment: { title: 'Pago de deuda', description: 'Tarjeta o préstamo', icon: CreditCard },
  refund: { title: 'Reembolso', description: 'Devolución de una compra', icon: RotateCcw },
}
const CONFIRM_LABELS = {
  expense: 'Confirmar gasto',
  income: 'Confirmar ingreso',
  transfer: 'Confirmar transferencia',
  card_payment: 'Confirmar pago de deuda',
  refund: 'Confirmar reembolso',
}
const TYPES_BY_DIRECTION = {
  incoming: ['income', 'transfer', 'refund'],
  outgoing: ['expense', 'transfer', 'card_payment'],
}
const AI_CONFIDENCE = { high: 'alta', medium: 'media' }

// Formulario explícito: el nombre del banco o destinatario nunca elige cuenta ni tipo por sí solo.
export function BankEmailReview({ item, accounts, categories, transactions, hidden, resolve, fixedExpenses = [], payFrequency, nextPayDate, categoryRules = [] }) {
  const candidate = item.candidate
  const aiClassification = candidate.ai_classification
  const aiSuggestion = aiClassification?.suggestion
  const [action, setAction] = useState('')
  const [type, setType] = useState('')
  const [amount, setAmount] = useState(candidate.amount_minor !== null && candidate.amount_minor !== undefined ? toInputAmount(candidate.amount_minor) : '')
  const [date, setDate] = useState(candidate.occurred_at ? new Date(Date.parse(candidate.occurred_at) - 5 * 3600000).toISOString().slice(0, 16) : '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('')
  const [rememberCategory, setRememberCategory] = useState(false)
  const [recurringPaymentId, setRecurringPaymentId] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [transaction, setTransaction] = useState('')
  const [distinct, setDistinct] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const duplicateConflict = /movimiento similar|otro movimiento/i.test(error)
  const categoryType = type === 'income' ? 'income' : 'expense'
  const categorySuggestion = suggestMerchantCategory(candidate.counterparty, categoryRules, categories, categoryType)
  const matchingRule = categoryRules.find((rule) => rule.active !== false && rule.normalized_pattern === normalizeMerchantName(candidate.counterparty))
  const recurringExpenses = useMemo(() => readFixedExpenses(fixedExpenses), [fixedExpenses])
  const scheduleDate = date.slice(0, 10) || calendarToday()
  const nearbyPayments = useMemo(() => {
    if (type !== 'expense' || !recurringExpenses.length) return []
    return getRecurringExpenseOccurrences(recurringExpenses, {
      from: addCalendarDays(scheduleDate, -45), to: addCalendarDays(scheduleDate, 45), today: calendarToday(),
      includePaid: false, maxOccurrencesPerExpense: 4, transactions, payFrequency, nextPayDate,
    })
  }, [type, recurringExpenses, scheduleDate, transactions, payFrequency, nextPayDate])
  const recurringPayment = nearbyPayments.find((payment) => payment.id === recurringPaymentId) || null
  const actualAmount = safeParseAmount(amount)
  const amountDifference = amountDifferenceFromPlan(actualAmount, recurringPayment?.amount_minor)
  const needsCategory = ['expense', 'income', 'refund'].includes(type)
  const needsFrom = ['expense', 'transfer', 'card_payment'].includes(type)
  const needsTo = ['income', 'transfer', 'card_payment', 'refund'].includes(type)
  const activeAccounts = accounts.filter((account) => !account.archived)
  const allowedTypes = TYPES_BY_DIRECTION[candidate.direction] || Object.keys(TYPES)
  const typeOptions = Object.entries(TYPES).filter(([key]) => allowedTypes.includes(key))

  // Mantiene las opciones compatibles con la dirección detectada y exige que la persona elija.
  const categoryCreated = (id) => { setCategory(id); setError('') }

  // Elegir cómo ocurrió el movimiento también inicia el registro; evita dos menús en serie.
  const chooseMovementType = (nextType) => {
    setAction('record')
    setType(nextType)
    setFrom('')
    setTo('')
    setCategory(suggestMerchantCategory(candidate.counterparty, categoryRules, categories, nextType === 'income' ? 'income' : 'expense'))
    setRememberCategory(false)
    setRecurringPaymentId('')
    setDistinct(false)
    setError('')
  }

  // Vincula el gasto real a una ocurrencia sin cambiar el monto previsto para las siguientes fechas.
  const selectRecurringPayment = (id) => {
    setRecurringPaymentId(id)
    const occurrence = nearbyPayments.find((payment) => payment.id === id)
    if (!occurrence) return
    const matchingCategory = categories.find((entry) => entry.type === 'expense' && (
      entry.id === occurrence.categoryId || entry.name.localeCompare(occurrence.name, 'es', { sensitivity: 'base' }) === 0
    ))
    setCategory(matchingCategory?.id || '')
  }

  // Conserva campos tras cualquier error; se refrescan saldos solo después de confirmación del servidor.
  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const payload = action === 'record' ? {
        type, amount_minor: parseLocalizedAmount(amount), currency: 'COP', occurred_at: new Date(`${date}:00-05:00`).toISOString(),
        from_account_id: needsFrom ? from : null, to_account_id: needsTo ? to : null,
        category_id: needsCategory ? category : null, merchant_name: candidate.counterparty?.slice(0, 120) || null,
        note: 'Confirmado desde correo bancario',
      } : {}
      const categoryRule = action === 'record' && type === 'expense' && rememberCategory && category && candidate.counterparty
        ? { merchant_pattern: candidate.counterparty, category_id: category }
        : null
      await resolve(item.id, action, payload, action === 'link' ? transaction : null, distinct,
        action === 'record' && recurringPayment ? { expenseId: recurringPayment.expenseId, dueDate: recurringPayment.dueDate, name: recurringPayment.name } : null,
        categoryRule)
    } catch (issue) { setError(issue.message) } finally { setBusy(false) }
  }
  return <>
  <form className="review-form bank-email-review" onSubmit={submit}>
    <div className="bank-review-trust"><ShieldCheck aria-hidden="true" /><p><strong>Revisa antes de registrar</strong><span>El correo no confirma por sí solo el movimiento. Compruébalo en tu banco; nunca ingreses claves ni números completos de cuenta.</span></p></div>
    {aiSuggestion ? <p className="bank-review-ai-suggestion" role="status"><strong>La IA sugiere: {TYPES[aiSuggestion.type] || 'revisar'} · confianza {AI_CONFIDENCE[aiSuggestion.confidence] || 'por confirmar'}</strong><span>Comprueba el aviso y selecciona el tipo correcto. Esta sugerencia no registra el movimiento.</span></p> : aiClassification?.status === 'needs_review' && <p className="info-note" role="status">La IA no pudo determinar el tipo con suficiente confianza. Elige la opción correcta manualmente.</p>}
    <fieldset className="bank-review-intents">
      <legend>¿Cómo quieres registrarlo?</legend>
      <div className={`bank-review-intents__grid bank-review-intents__grid--${typeOptions.length}`}>
        {typeOptions.map(([key]) => { const IntentIcon = INTENTS[key].icon; const aiRecommended = aiSuggestion?.type === key; return <button key={key} type="button" className={`bank-review-intent${action === 'record' && type === key ? ' is-selected' : ''}${aiRecommended ? ' is-ai-suggested' : ''}`} aria-pressed={action === 'record' && type === key} onClick={() => chooseMovementType(key)}>
          <span className="bank-review-intent__icon"><IntentIcon aria-hidden="true" /></span><span className="bank-review-intent__copy"><strong>{INTENTS[key].title}</strong><small>{INTENTS[key].description}</small></span>{action === 'record' && type === key && <Check className="bank-review-intent__check" aria-hidden="true" />}
        </button>})}
      </div>
    </fieldset>
    <details className="bank-review-more">
      <summary><Ellipsis aria-hidden="true" /><span>Más opciones</span></summary>
      <div className="bank-review-more__choices">
        <button type="button" className={action === 'link' ? 'is-selected' : ''} aria-pressed={action === 'link'} onClick={() => { setAction('link'); setError('') }}>Ya está registrado</button>
        <button type="button" className={action === 'dismiss' ? 'is-selected' : ''} aria-pressed={action === 'dismiss'} onClick={() => { setAction('dismiss'); setError('') }}>Descartar aviso</button>
      </div>
    </details>
    {action === 'record' && <>
      {type === 'transfer' && <p className="bank-review-type-note">El traslado entre cuentas propias no suma ingresos ni gastos.</p>}
      {type === 'income' && <p className="bank-review-type-note">Si luego abonas este dinero a una deuda, registra ese pago por separado desde Cuentas.</p>}
      <section className="bank-review-entry" aria-label="Datos del movimiento">
      {hidden ? <p role="status">Desactiva «Ocultar montos» en Ajustes para revisar y registrar el importe.</p> : <label className="bank-review-amount"><span className="bank-review-amount__label">Monto del movimiento <small>Detectado en el correo</small></span><span className="bank-review-amount__control"><span>COP</span><input required inputMode="decimal" aria-label="Monto detectado en COP" value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); setDistinct(false) }} /></span></label>}
      <label className="field bank-review-date"><span>Fecha y hora</span><input required type="datetime-local" value={date} onChange={(event) => { setDate(event.target.value); setRecurringPaymentId(''); setError(''); setDistinct(false) }} /></label>
      {type === 'expense' && recurringExpenses.length > 0 && <>
        <label className="field"><span>¿Corresponde a un gasto fijo?</span><select aria-label="Vincular gasto fijo (opcional)" value={recurringPayment?.id || ''} onChange={(event) => selectRecurringPayment(event.target.value)}><option value="">No, registrar solo como gasto</option>{nearbyPayments.map((payment) => <option key={payment.id} value={payment.id}>{payment.name} · {formatDueDate(payment.dueDate)} · previsto {formatMinor(payment.amount_minor, 'COP', hidden)}</option>)}</select></label>
        {!nearbyPayments.length && <p className="info-note">No hay vencimientos pendientes cerca de la fecha del correo.</p>}
        {recurringPayment && <div className="info-note" role="status"><p><strong>Previsto:</strong> {formatMinor(recurringPayment.amount_minor, 'COP', hidden)}. <strong>Real:</strong> {actualAmount === null ? 'Verifica el importe' : formatMinor(actualAmount, 'COP', hidden)}.</p><p>{formatAmountDifference(amountDifference, hidden)}</p><p>Al confirmar, se registrará el monto real y esta fecha quedará pagada. Las próximas fechas conservarán el monto previsto.</p></div>}
      </>}
      {type === 'transfer' ? <div className="bank-review-account-flow"><AccountSelect label="Sale de" value={from} setValue={setFrom} accounts={activeAccounts.filter((account) => account.kind === 'asset')} /><ArrowLeftRight className="bank-review-account-flow__arrow" aria-hidden="true" /><AccountSelect label="Llega a" value={to} setValue={setTo} accounts={activeAccounts.filter((account) => account.id !== from && account.kind === 'asset')} /></div> : <>
        {needsFrom && <AccountSelect label="Cuenta de origen" value={from} setValue={setFrom} accounts={activeAccounts.filter((account) => type === 'expense' || account.kind === 'asset')} />}
        {needsTo && <AccountSelect label="Cuenta de destino" value={to} setValue={setTo} accounts={activeAccounts.filter((account) => account.id !== from && (type === 'refund' || account.kind === (type === 'card_payment' ? 'liability' : 'asset')))} />}
      </>}
      {needsCategory && <>
        <div className="field"><span>Categoría</span><div className="input-with-action"><select aria-label="Categoría" required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecciona…</option>{categories.filter((entry) => entry.type === categoryType).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><button type="button" className="icon-button" aria-label="Crear categoría" disabled={busy} onClick={() => setAddingCategory(true)}><Plus aria-hidden="true" /></button></div></div>
        {categorySuggestion && category === categorySuggestion && <p className="info-note">Sugerida por una regla exacta que confirmaste antes para este comercio.</p>}
        {type === 'expense' && candidate.counterparty && candidate.counterparty.length <= 120 && category && matchingRule?.category_id !== category && <label className="check-row"><input type="checkbox" checked={rememberCategory} onChange={(event) => setRememberCategory(event.target.checked)} /> Recordar esta categoría para futuras compras de este comercio</label>}
      </>}
      {duplicateConflict && <>
        <p className="info-note">Encontré un movimiento con el mismo monto y una hora cercana. Si es el mismo, elige «Ya está registrado». Si es distinto, confírmalo abajo.</p>
        <label className="check-row"><input type="checkbox" checked={distinct} onChange={(event) => setDistinct(event.target.checked)} /> Es otro movimiento distinto; regístralo por separado.</label>
      </>}
      </section>
    </>}
    {action === 'link' && <label className="field"><span>Movimiento ya registrado</span><select required value={transaction} onChange={(event) => setTransaction(event.target.value)}><option value="">Selecciona…</option>{transactions.filter((entry) => entry.status === 'recorded').map((entry) => <option key={entry.id} value={entry.id}>{entry.occurred_at.slice(0, 10)} · {entry.merchant_name || TYPES[entry.type] || entry.type} · {formatMinor(entry.amount_minor, 'COP', hidden)}</option>)}</select></label>}
    {action === 'dismiss' && <p className="info-note">El aviso se quitará de “Por revisar”. No se creará ningún movimiento ni cambiarán tus saldos.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {action && <button className="button button--primary bank-review-submit" disabled={busy || (action === 'record' && (!type || hidden || (duplicateConflict && !distinct))) || (action === 'link' && !transaction)}>{busy ? 'Guardando…' : action === 'record' ? <><Check aria-hidden="true" />{CONFIRM_LABELS[type]}</> : action === 'link' ? 'Vincular al movimiento' : 'Descartar aviso'}</button>}
  </form>
  {addingCategory && <CategoryDialog type={categoryType} close={() => setAddingCategory(false)} onCreated={categoryCreated} />}
  </>
}

// Selector nativo con opción vacía: no preselecciona una cuenta de otro banco accidentalmente.
function AccountSelect({ label, value, setValue, accounts }) {
  return <label className="field"><span>{label}</span><select required value={value} onChange={(event) => setValue(event.target.value)}><option value="">Selecciona…</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
}

// Calcula el exceso o ahorro frente al monto previsto usando siempre unidades menores enteras.
function amountDifferenceFromPlan(actualAmount, plannedAmount) {
  return actualAmount === null || plannedAmount === undefined ? null : actualAmount - plannedAmount
}

// Los campos incompletos siguen visibles mientras el usuario edita el correo.
function safeParseAmount(value) {
  try { return parseLocalizedAmount(value) } catch { return null }
}

// Explica el desvío sin confundir el pago real con el monto de las siguientes recurrencias.
function formatAmountDifference(difference, hidden) {
  if (difference === null) return 'Confirma el monto para comparar con lo previsto.'
  if (difference === 0) return 'El pago coincide con el monto previsto.'
  const amount = formatMinor(Math.abs(difference), 'COP', hidden)
  return difference > 0 ? `${amount} por encima de lo previsto.` : `${amount} por debajo de lo previsto.`
}

// La fecha del vencimiento es calendario local y no debe desplazarse por la zona horaria del dispositivo.
function formatDueDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}

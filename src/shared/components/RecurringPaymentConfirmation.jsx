import { useRef, useState } from 'react'
import { useApp } from '../../app/AppContext.jsx'
import { formatInputAmount, parseLocalizedAmount, toInputAmount } from '../../domain/money.js'
import { today } from '../lib/date.js'
import { Field, SimpleDialog } from './Modal.jsx'

// Confirma el vencimiento y registra el pago real en una sola acción, sin pedir contabilidad al usuario.
export function RecurringPaymentConfirmation({ payment, onCancel, onDone }) {
  const { accounts, categories, actions, notify } = useApp()
  const categoryOptions = categories.filter((item) => item.type === 'expense')
  const matchedCategory = categoryOptions.find((item) => item.name.localeCompare(payment.name, 'es', { sensitivity: 'base' }) === 0)
  const [amount, setAmount] = useState(toInputAmount(payment.amount_minor))
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState(payment.categoryId || matchedCategory?.id || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const close = () => { if (!savingRef.current) onCancel() }

  const confirm = async (event) => {
    event.preventDefault()
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const amountMinor = parseLocalizedAmount(amount)
      if (!categoryOptions.some((item) => item.id === categoryId)) throw new Error('Elige una categoría para registrar este pago.')
      if (accountId && !accounts.some((item) => item.id === accountId && !item.archived)) throw new Error('Elige una cuenta disponible.')
      const record = {
        id: `fixed-payment:${payment.id}`,
        type: 'expense', amount_minor: amountMinor, currency: 'COP',
        occurred_at: `${today()}T12:00:00-05:00`,
        from_account_id: accountId || null, to_account_id: null, category_id: categoryId,
        merchant_name: payment.name, note: '', source: 'manual', status: 'recorded', updated_at: new Date().toISOString(),
      }
      await actions.recordRecurringPayment(payment, record)
      notify(`${payment.name} pagado y registrado`)
      onDone()
    } catch (issue) {
      setError(issue.message || 'No pudimos registrar el pago. Inténtalo de nuevo.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <SimpleDialog title="Confirmar pago" close={close}>
    <form className="recurring-payment-confirmation" onSubmit={confirm}>
      <p>¿Ya pagaste <strong>{payment.name}</strong>? Se quitará de la checklist y aparecerá en Actividad.</p>
      <p className="helper">Vencimiento: {formatDueDate(payment.dueDate)}. Se registra con la fecha de hoy.</p>
      <Field label="Monto pagado"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} /></Field>
      <Field label="¿Con qué pagaste?"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Dinero disponible</option>{accounts.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}{item.kind === 'liability' ? ' (crédito)' : ''}</option>)}</select></Field>
      <Field label="Categoría"><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Selecciona una categoría</option>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {!accountId && <p className="helper">El pago contará en tu presupuesto, pero no cambiará el saldo de una cuenta.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="sheet__actions"><button className="button button--secondary" type="button" disabled={saving} onClick={close}>Todavía no</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Sí, registrar pago'}</button></div>
    </form>
  </SimpleDialog>
}

// Formatea la fecha como calendario local sin desplazarla por zona horaria.
function formatDueDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}

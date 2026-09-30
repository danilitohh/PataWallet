import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { formatInputAmount, parseLocalizedAmount, toInputAmount } from '../../domain/money.js'
import { today } from '../lib/date.js'
import { Field, SimpleDialog } from './Modal.jsx'
import { CategoryDialog } from './CategoryDialog.jsx'
import { AccountDialog } from '../../features/accounts/components/AccountDialogs.jsx'

// Confirma el vencimiento y registra el pago real en una sola acción, sin pedir contabilidad al usuario.
export function RecurringPaymentConfirmation({ payment, onCancel, onDone }) {
  const { accounts, categories, actions, notify } = useApp()
  const categoryOptions = categories.filter((item) => item.type === 'expense')
  const matchedCategory = categoryOptions.find((item) => item.name.localeCompare(payment.name, 'es', { sensitivity: 'base' }) === 0)
  // Un gasto fijo sale de dinero disponible; una deuda requiere un pago de tarjeta separado.
  const paymentAccounts = accounts.filter((item) => item.kind === 'asset' && !item.archived)
  const [amount, setAmount] = useState(toInputAmount(payment.amount_minor))
  const [accountId, setAccountId] = useState(paymentAccounts[0]?.id || '')
  const [addingAccount, setAddingAccount] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryId, setCategoryId] = useState(payment.categoryId || matchedCategory?.id || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const close = () => { if (!savingRef.current) onCancel() }
  // Selecciona la categoría nueva y limpia el aviso de validación previo.
  const categoryCreated = (id) => { setCategoryId(id); setError('') }

  const confirm = async (event) => {
    event.preventDefault()
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const amountMinor = parseLocalizedAmount(amount)
      if (!categoryOptions.some((item) => item.id === categoryId)) throw new Error('Elige una categoría para registrar este pago.')
      if (!paymentAccounts.some((item) => item.id === accountId)) throw new Error('Elige la cuenta con la que pagaste.')
      const record = {
        id: `fixed-payment:${payment.id}`,
        type: 'expense', amount_minor: amountMinor, currency: 'COP',
        occurred_at: `${today()}T12:00:00-05:00`,
        from_account_id: accountId, to_account_id: null, category_id: categoryId,
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

  return <><SimpleDialog title="Confirmar pago" close={close} inert={addingAccount || addingCategory}>
    <form className="recurring-payment-confirmation" onSubmit={confirm}>
      <p>¿Ya pagaste <strong>{payment.name}</strong>? Se quitará de la checklist y aparecerá en Actividad.</p>
      <p className="helper">Vencimiento: {formatDueDate(payment.dueDate)}. Se registra con la fecha de hoy.</p>
      <Field label="Monto pagado"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} /></Field>
      <Field label="¿Con qué pagaste?"><select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{!accountId && <option value="">Selecciona una cuenta</option>}{paymentAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {!paymentAccounts.some((item) => item.kind === 'asset') && <button className="button button--quiet" type="button" onClick={() => setAddingAccount(true)}>Agregar cuenta con dinero</button>}
      <div className="field"><span>Categoría</span><div className="input-with-action"><select aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Selecciona una categoría</option>{categoryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="icon-button" aria-label="Crear categoría" disabled={saving} onClick={() => setAddingCategory(true)}><Plus aria-hidden="true" /></button></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="sheet__actions"><button className="button button--secondary" type="button" disabled={saving} onClick={close}>Todavía no</button><button className="button button--primary" type="submit" disabled={saving || !accountId}>{saving ? 'Guardando…' : 'Sí, registrar pago'}</button></div>
    </form>
  </SimpleDialog>{addingCategory && <CategoryDialog type="expense" close={() => setAddingCategory(false)} onCreated={categoryCreated} />}{addingAccount && <AccountDialog assetOnly close={() => setAddingAccount(false)} onCreated={(account) => setAccountId(account.id)} />}</>
}

// Formatea la fecha como calendario local sin desplazarla por zona horaria.
function formatDueDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}

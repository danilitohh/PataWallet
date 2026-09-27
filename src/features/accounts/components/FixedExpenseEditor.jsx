import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { MAX_FIXED_EXPENSES, fixedExpensesToInput, parseFixedExpenses, readFixedExpenses } from '../../../domain/financialSetup.js'
import { formatInputAmount } from '../../../domain/money.js'
import { FIXED_EXPENSE_FREQUENCY_OPTIONS, calendarToday } from '../../../domain/recurringExpenses.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { makeId } from '../../../shared/lib/id.js'

// Edita un compromiso y mezcla el cambio con los datos actuales, conservando sus pagos.
export function FixedExpenseEditor({ expense, close }) {
  const { settings, actions, notify } = useApp()
  const [row, setRow] = useState(() => expense ? fixedExpensesToInput([expense])[0] : { id: makeId('fixed'), name: '', amount: '', frequency: 'monthly', nextDueDate: calendarToday(), paymentHistory: [] })
  const [removing, setRemoving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cancelButton = useRef(null)
  // Tras cambiar de modo, enfoca una acción segura que sigue presente en ambos estados.
  const changeMode = (remove) => {
    setRemoving(remove)
    setError('')
    requestAnimationFrame(() => cancelButton.current?.focus())
  }
  const update = (key) => (event) => setRow((current) => ({ ...current, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value }))

  // Conserva el borrador si falla y bloquea el cierre mientras se guarda.
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setError('')
    setSaving(true)
    try {
      const current = readFixedExpenses(settings.fixedExpenses)
      const original = current.find((item) => item.id === row.id)
      if (expense && !original) throw new Error('Este gasto ya no existe. Cierra el editor y revisa la lista.')
      let next
      if (removing) {
        next = current.filter((item) => item.id !== row.id)
      } else {
        const parsed = parseFixedExpenses([row])[0]
        if (!parsed) throw new Error('Indica el nombre y el monto del gasto fijo.')
        if (!expense && current.length >= MAX_FIXED_EXPENSES) throw new Error(`Puedes registrar hasta ${MAX_FIXED_EXPENSES} gastos fijos.`)
        const updated = { ...parsed, payment_history: original?.payment_history || parsed.payment_history, category_id: original?.category_id || parsed.category_id }
        next = expense ? current.map((item) => item.id === row.id ? updated : item) : [...current, updated]
      }
      await actions.setSetting('fixedExpenses', next)
      notify(removing ? 'Gasto fijo eliminado. Tus movimientos se conservan.' : 'Gasto fijo guardado')
      close()
    } catch (issue) {
      setError(issue.message)
    } finally {
      setSaving(false)
    }
  }

  return <SimpleDialog title={removing ? 'Eliminar gasto fijo' : expense ? 'Editar gasto fijo' : 'Agregar gasto fijo'} close={() => { if (!saving) close() }}>
    <form className="fixed-expense-editor" onSubmit={save} aria-describedby={error ? 'fixed-expense-error' : undefined} aria-busy={saving}>
      {removing ? <p>¿Eliminar «{expense.name}» y quitar sus vencimientos de la checklist? Los movimientos que ya registraste no se borrarán.</p> : <>
        <Field label="Nombre"><input required minLength={2} maxLength={80} value={row.name} onChange={update('name')} placeholder="Internet o mercado" disabled={saving} /></Field>
        <Field label={row.frequency === 'monthly' ? 'Monto mensual' : 'Monto por pago'}><input required inputMode="decimal" value={row.amount} onChange={update('amount')} placeholder="150.000" disabled={saving} /></Field>
        <Field label="¿Cada cuánto se hace este pago?"><select value={row.frequency} onChange={update('frequency')} disabled={saving}>{FIXED_EXPENSE_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Próxima fecha de pago"><input type="date" required={row.frequency !== 'monthly'} value={row.nextDueDate} onChange={update('nextDueDate')} disabled={saving} aria-describedby="fixed-expense-schedule" /></Field>
        <p id="fixed-expense-schedule" className="helper">{scheduleDescription(row.frequency)}</p>
      </>}
      {error && <p id="fixed-expense-error" className="form-error" role="alert">{error}</p>}
      <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : removing ? 'Sí, eliminar gasto fijo' : 'Guardar gasto fijo'}</button>
      <button ref={cancelButton} type="button" className="button button--secondary" disabled={saving} onClick={() => removing ? changeMode(false) : close()}>{removing ? 'Volver a editar' : 'Cancelar'}</button>
      {expense && !removing && <button type="button" className="button fixed-expense-editor__delete" disabled={saving} onClick={() => changeMode(true)}><Trash2 aria-hidden="true" /> Eliminar gasto fijo</button>}
    </form>
  </SimpleDialog>
}

// Explica la recurrencia existente sin cambiar sus reglas ni inventar pagos.
function scheduleDescription(frequency) {
  if (frequency === 'payday') return 'Se genera según tu frecuencia y próxima fecha de pago configuradas en Ingresos.'
  if (frequency === 'biweekly') return 'Se repetirá cada 15 días a partir de la fecha indicada.'
  if (frequency === 'weekly') return 'Se repetirá cada 7 días a partir de la fecha indicada.'
  return 'Se repetirá el mismo día de cada mes. Guardarlo no registra un pago.'
}

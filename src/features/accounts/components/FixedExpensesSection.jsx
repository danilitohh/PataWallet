import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { fixedExpensesToInput, parseFixedExpenses, readFixedExpenses } from '../../../domain/financialSetup.js'
import { formatInputAmount, formatMinor } from '../../../domain/money.js'
import { FIXED_EXPENSE_FREQUENCY_OPTIONS, calendarToday, expenseFrequencyLabel, sumExpectedFixedExpenses } from '../../../domain/recurringExpenses.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { AccountSectionToggle, useAccountSectionExpansion } from './AccountSectionToggle.jsx'
import { RecurringPaymentChecklist } from './RecurringPaymentChecklist.jsx'

// Permite revisar y actualizar los compromisos mensuales desde el área de Cuentas.
export function FixedExpensesSection() {
  const { settings, actions, notify } = useApp()
  const today = calendarToday()
  const [expanded, setExpanded] = useAccountSectionExpansion('gastos-fijos')
  const [rows, setRows] = useState(() => {
    const saved = fixedExpensesToInput(settings.fixedExpenses, { defaultDueDate: today })
    return saved.length ? saved : [blankRow(today)]
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (id, key) => (event) => setRows((items) => items.map((item) => item.id === id ? { ...item, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value } : item))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const currentById = new Map(readFixedExpenses(settings.fixedExpenses).map((expense) => [expense.id, expense]))
      const parsed = parseFixedExpenses(rows).map((expense) => ({
        ...expense,
        // Conserva pagos marcados desde la checklist aunque el formulario conserve una versión anterior de la fila.
        payment_history: currentById.get(expense.id)?.payment_history || expense.payment_history,
      }))
      await actions.setSetting('fixedExpenses', parsed)
      notify('Gastos fijos guardados')
    } catch (issue) {
      setError(issue.message)
    } finally {
      setSaving(false)
    }
  }

  let total = 0
  try { total = sumExpectedFixedExpenses(parseFixedExpenses(rows), { month: today.slice(0, 7), payFrequency: settings.payFrequency, nextPayDate: settings.nextPayDate }) } catch { /* El detalle se muestra junto al campo al guardar. */ }
  const savedExpenses = readFixedExpenses(settings.fixedExpenses)
  const savedTotal = sumExpectedFixedExpenses(savedExpenses, { month: today.slice(0, 7), payFrequency: settings.payFrequency, nextPayDate: settings.nextPayDate })
  const sectionSummary = savedExpenses.length ? `${savedExpenses.length} ${savedExpenses.length === 1 ? 'gasto' : 'gastos'} · ${formatMinor(savedTotal, 'COP', settings.hiddenAmounts)} al mes` : 'Sin gastos configurados'

  return <section className="settings-group fixed-expenses-section" id="gastos-fijos">
    <AccountSectionToggle sectionId="gastos-fijos" title="Gastos fijos" description="Compromisos mensuales que salen antes de considerar compras nuevas." summary={sectionSummary} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
    {expanded && <div id="gastos-fijos-content" className="account-section-toggle__content">
      <p className="settings-group__intro">Arriendo, internet, comida y otros compromisos. PataWallet calcula sus vencimientos y los resta del dinero libre como referencia; no crea cargos automáticos.</p>
      <form onSubmit={submit}>
        <div className="settings-repeatable">{rows.map((row, index) => <FixedExpenseRow key={row.id} row={row} index={index} update={update} remove={() => setRows((items) => items.filter((item) => item.id !== row.id))} />)}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="settings-repeatable__actions"><button type="button" className="button button--secondary" onClick={() => setRows((items) => [...items, blankRow(today)])}><Plus /> Agregar gasto fijo</button><span>Total mensual estimado: <strong>{formatMinor(total, 'COP')}</strong></span></div>
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gastos fijos'}</button>
      </form>
      <RecurringPaymentChecklist expenses={savedExpenses} settings={settings} actions={actions} notify={notify} />
    </div>}
  </section>
}

// Renderiza los campos de programación de un compromiso recurrente.
function FixedExpenseRow({ row, index, update, remove }) {
  const monthly = row.frequency === 'monthly'
  return <div className="settings-repeatable__item fixed-expense-row">
    <div className="repeatable-heading"><strong>Gasto fijo {index + 1}</strong><button type="button" className="icon-button icon-button--small" aria-label={`Quitar gasto fijo ${index + 1}`} onClick={remove}><Trash2 /></button></div>
    <div className="form-grid"><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Internet o mercado" /></Field><Field label={monthly ? 'Monto mensual' : 'Monto por pago'}><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="900.000" /></Field></div>
    <div className="form-grid"><Field label="¿Cada cuánto se hace este pago?"><select value={row.frequency} onChange={update(row.id, 'frequency')}>{FIXED_EXPENSE_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field><Field label="Próxima fecha de pago"><input type="date" value={row.nextDueDate} onChange={update(row.id, 'nextDueDate')} /></Field></div>
    <p className="helper">{scheduleDescription(row.frequency)}</p>
  </div>
}

function blankRow(nextDueDate) {
  return { id: makeId('fixed'), name: '', amount: '', frequency: 'monthly', nextDueDate, paymentHistory: [] }
}

function scheduleDescription(frequency) {
  if (frequency === 'payday') return 'Se genera según la frecuencia y la próxima fecha que configuraste en Ingresos.'
  if (frequency === 'biweekly') return 'Se repetirá cada 15 días a partir de la próxima fecha indicada.'
  if (frequency === 'weekly') return 'Se repetirá cada 7 días a partir de la próxima fecha indicada.'
  return `Se generará el mismo día de cada mes. ${expenseFrequencyLabel(frequency)}.`
}

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { fixedExpensesToInput, parseFixedExpenses, sumFixedExpenses } from '../../../domain/financialSetup.js'
import { formatInputAmount, formatMinor } from '../../../domain/money.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { makeId } from '../../../shared/lib/id.js'

// Permite revisar y actualizar los compromisos mensuales sin convertirlos en movimientos.
export function FixedExpensesSettings() {
  const { settings, actions, notify } = useApp()
  const [rows, setRows] = useState(() => {
    const saved = fixedExpensesToInput(settings.fixedExpenses)
    return saved.length ? saved : [{ id: makeId('fixed'), name: '', amount: '' }]
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (id, key) => (event) => setRows((items) => items.map((item) => item.id === id ? { ...item, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value } : item))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const parsed = parseFixedExpenses(rows)
      await actions.setSetting('fixedExpenses', parsed)
      notify('Gastos fijos guardados')
    } catch (issue) {
      setError(issue.message)
    } finally {
      setSaving(false)
    }
  }

  let total = 0
  try { total = sumFixedExpenses(parseFixedExpenses(rows)) } catch { /* El detalle se muestra junto al campo al guardar. */ }

  return <section className="settings-group fixed-expenses-settings" id="gastos-fijos">
    <h2>Gastos fijos</h2>
    <p className="settings-group__intro">Arriendo, internet, comida y otros compromisos que salen cada mes. PataWallet los resta del dinero libre como referencia; no crea cargos automáticos.</p>
    <form onSubmit={submit}>
      <div className="settings-repeatable">{rows.map((row, index) => <div className="settings-repeatable__item" key={row.id}><div className="repeatable-heading"><strong>Gasto fijo {index + 1}</strong><button type="button" className="icon-button icon-button--small" aria-label={`Quitar gasto fijo ${index + 1}`} onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}><Trash2 /></button></div><div className="form-grid"><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Arriendo" /></Field><Field label="Monto mensual"><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="900.000" /></Field></div></div>)}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="settings-repeatable__actions"><button type="button" className="button button--secondary" onClick={() => setRows((items) => [...items, { id: makeId('fixed'), name: '', amount: '' }])}><Plus /> Agregar gasto fijo</button><span>Total mensual: <strong>{formatMinor(total, 'COP')}</strong></span></div>
      <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gastos fijos'}</button>
    </form>
  </section>
}

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { fixedExpensesToInput, parseFixedExpenses, readFixedExpenses, sumFixedExpenses } from '../../../domain/financialSetup.js'
import { formatMinor } from '../../../domain/money.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { AccountSectionToggle, useAccountSectionExpansion } from './AccountSectionToggle.jsx'

// Permite revisar y actualizar los compromisos mensuales desde el área de Cuentas.
export function FixedExpensesSection() {
  const { settings, actions, notify } = useApp()
  const [expanded, setExpanded] = useAccountSectionExpansion('gastos-fijos')
  const [rows, setRows] = useState(() => {
    const saved = fixedExpensesToInput(settings.fixedExpenses)
    return saved.length ? saved : [{ id: makeId('fixed'), name: '', amount: '' }]
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (id, key) => (event) => setRows((items) => items.map((item) => item.id === id ? { ...item, [key]: event.target.value } : item))

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
  const savedExpenses = readFixedExpenses(settings.fixedExpenses)
  const savedTotal = sumFixedExpenses(savedExpenses)

  return <section className="settings-group fixed-expenses-section" id="gastos-fijos">
    <AccountSectionToggle sectionId="gastos-fijos" title="Gastos fijos" description="Compromisos mensuales que salen antes de considerar compras nuevas." summary={savedExpenses.length ? `${savedExpenses.length} ${savedExpenses.length === 1 ? 'gasto configurado' : 'gastos configurados'} · ${formatMinor(savedTotal, 'COP', settings.hiddenAmounts)}` : 'Sin gastos configurados'} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
    {expanded && <div id="gastos-fijos-content" className="account-section-toggle__content">
      <p className="settings-group__intro">Arriendo, internet, comida y otros compromisos. PataWallet los resta del dinero libre como referencia; no crea cargos automáticos.</p>
      <form onSubmit={submit}>
        <div className="settings-repeatable">{rows.map((row, index) => <div className="settings-repeatable__item" key={row.id}><div className="repeatable-heading"><strong>Gasto fijo {index + 1}</strong><button type="button" className="icon-button icon-button--small" aria-label={`Quitar gasto fijo ${index + 1}`} onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}><Trash2 /></button></div><div className="form-grid"><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Arriendo" /></Field><Field label="Monto mensual"><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="900.000" /></Field></div></div>)}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="settings-repeatable__actions"><button type="button" className="button button--secondary" onClick={() => setRows((items) => [...items, { id: makeId('fixed'), name: '', amount: '' }])}><Plus /> Agregar gasto fijo</button><span>Total mensual: <strong>{formatMinor(total, 'COP')}</strong></span></div>
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gastos fijos'}</button>
      </form>
    </div>}
  </section>
}

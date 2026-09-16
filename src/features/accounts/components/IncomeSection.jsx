import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { formatInputAmount, toInputAmount } from '../../../domain/money.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { AccountSectionToggle, useAccountSectionExpansion } from './AccountSectionToggle.jsx'
import { PAY_FREQUENCY_OPTIONS } from '../../settings/model/incomeSettings.js'
import { fixedIncomeSummary, incomeSourcesToInput, INCOME_SOURCE_TYPES, parseIncomeSources } from '../../settings/model/incomeSources.js'

// Administra fuentes de ingreso vinculadas a cuentas sin crear movimientos automáticos.
export function IncomeSection() {
  const { settings, accounts, actions, notify } = useApp()
  const activeAssets = accounts.filter((account) => account.kind === 'asset' && !account.archived)
  const [expanded, setExpanded] = useAccountSectionExpansion('ingresos')
  const [rows, setRows] = useState(() => initialRows(settings, activeAssets))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (id, key) => (event) => {
    const value = key === 'amount' ? formatInputAmount(event.target.value) : event.target.value
    setRows((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item))
  }

  const changeType = (id, type) => {
    setRows((items) => items.map((item) => item.id === id
      ? { ...item, type, frequency: type === 'fixed_salary' ? item.frequency : '', nextPayDate: type === 'fixed_salary' ? item.nextPayDate : '' }
      : item))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (saving) return
    setSaving(true)
    try {
      const parsed = parseIncomeSources(rows, accounts)
      const { salaryMinor, primary } = fixedIncomeSummary(parsed)
      // Conserva las claves antiguas como una vista compatible para el dashboard y respaldos anteriores.
      await actions.setSetting('incomeSources', parsed)
      await actions.setSetting('monthlySalaryMinor', salaryMinor)
      await actions.setSetting('payFrequency', primary?.frequency || null)
      await actions.setSetting('nextPayDate', primary?.next_pay_date || null)
      notify('Ingresos guardados')
    } catch (issue) {
      setError(issue.message)
    } finally {
      setSaving(false)
    }
  }

  const add = () => setRows((items) => [...items, blankRow(activeAssets[0]?.id || '')])
  const remove = (id) => setRows((items) => items.filter((item) => item.id !== id))

  const configuredRows = rows.filter((row) => [row.name, row.amount, row.frequency, row.nextPayDate].some((value) => String(value || '').trim()))
  return <section className="settings-group income-section" id="ingresos">
    <AccountSectionToggle sectionId="ingresos" title="Ingresos" description="Fuentes de dinero asociadas a tus cuentas disponibles." summary={configuredRows.length ? incomeSummaryLabel(configuredRows) : 'Sin fuentes configuradas'} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
    {expanded && <div id="ingresos-content" className="account-section-toggle__content">
      <p className="settings-group__intro">Clasifica cada ingreso y elige la cuenta donde lo recibes. El sueldo fijo sirve para estimar tu dinero libre; los extras esporádicos solo quedan como referencia hasta que registres el movimiento.</p>
      <form onSubmit={submit}>
        {rows.length > 0 && <div className="settings-repeatable">{rows.map((row, index) => <IncomeSourceRow key={row.id} row={row} index={index} accounts={activeAssets} update={update} changeType={changeType} remove={remove} error={error} />)}</div>}
        {!activeAssets.length && <div className="info-note"><strong>Primero agrega una cuenta disponible</strong><span>La cuenta de destino se crea desde el botón Agregar de esta pantalla; después podrás asociarle el ingreso.</span></div>}
        <div className="settings-repeatable__actions"><button type="button" className="button button--secondary" onClick={add}><Plus /> Agregar ingreso</button><span>{incomeSummaryLabel(configuredRows)}</span></div>
        <p className="helper">Los ingresos extras no se suman al dinero libre mensual porque no son recurrentes. Regístralos desde Nuevo movimiento cuando los recibas.</p>
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ingresos'}</button>
      </form>
    </div>}
  </section>
}

// Renderiza una fuente y mantiene visibles solo los controles relevantes para su tipo.
function IncomeSourceRow({ row, index, accounts, update, changeType, remove, error }) {
  const isFixed = row.type === 'fixed_salary'
  return <div className="settings-repeatable__item income-source-row">
    <div className="repeatable-heading"><strong>Ingreso {index + 1}</strong><button type="button" className="icon-button icon-button--small" aria-label={`Quitar ingreso ${index + 1}`} onClick={() => remove(row.id)}><Trash2 /></button></div>
    <div className="form-grid"><Field label="Nombre del ingreso"><input value={row.name} onChange={update(row.id, 'name')} placeholder={isFixed ? 'Salario' : 'Freelance o venta'} /></Field><Field label="Tipo de ingreso"><select value={row.type} onChange={(event) => changeType(row.id, event.target.value)}>{INCOME_SOURCE_TYPES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field></div>
    <Field label="Cuenta donde recibes el ingreso"><select value={row.accountId} onChange={update(row.id, 'accountId')}><option value="">Selecciona una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></Field>
    {isFixed
      ? <><Field label="Sueldo mensual equivalente" error={error}><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="2.500.000" /></Field><Field label="¿Cada cuánto recibes tu pago?"><select value={row.frequency} onChange={update(row.id, 'frequency')}><option value="">Selecciona una frecuencia</option>{PAY_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field><Field label="Fecha de tu próximo pago" optional><input type="date" value={row.nextPayDate} onChange={update(row.id, 'nextPayDate')} /></Field></>
      : <Field label="Monto habitual" optional><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="0" /></Field>}
    <p className="helper">{isFixed ? 'Se usa solo como referencia mensual; registra cada pago real desde Nuevo movimiento.' : 'No es recurrente y no se incluye en el cálculo de dinero libre.'}</p>
  </div>
}

// Conserva la configuración antigua y crea una fila lista para editar a usuarios nuevos.
function initialRows(settings, accounts) {
  const saved = incomeSourcesToInput(settings.incomeSources, accounts)
  if (saved.length) return saved
  const salary = Number(settings.monthlySalaryMinor)
  if (Number.isSafeInteger(salary) && salary > 0) return [{ ...blankRow(accounts[0]?.id || ''), id: 'income-salary', name: 'Salario', amount: toInputAmount(salary), frequency: settings.payFrequency || '', nextPayDate: settings.nextPayDate || '' }]
  return [blankRow(accounts[0]?.id || '')]
}

function blankRow(accountId) {
  // Deja una fila nueva vacía; el parser asigna “Salario” cuando la persona ingresa datos.
  return { id: makeId('income'), name: '', type: 'fixed_salary', accountId, amount: '', frequency: '', nextPayDate: '' }
}

function incomeSummaryLabel(rows) {
  const fixedCount = rows.filter((row) => row.type === 'fixed_salary').length
  const extraCount = rows.filter((row) => row.type === 'occasional').length
  const labels = []
  if (fixedCount) labels.push(`${fixedCount} sueldo${fixedCount === 1 ? '' : 's'} fijo${fixedCount === 1 ? '' : 's'}`)
  if (extraCount) labels.push(`${extraCount} extra${extraCount === 1 ? '' : 's'} esporádico${extraCount === 1 ? '' : 's'}`)
  return labels.join(' · ') || 'Sin fuentes configuradas'
}

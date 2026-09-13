import { useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { toInputAmount } from '../../../domain/money.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { parseIncomeSettings, PAY_FREQUENCY_OPTIONS } from '../model/incomeSettings.js'

// Permite declarar sueldo y frecuencia de pago sin inventar ingresos ni movimientos automáticos.
export function IncomeSettings() {
  const { settings, actions, notify } = useApp()
  const [salary, setSalary] = useState(settings.monthlySalaryMinor ? toInputAmount(settings.monthlySalaryMinor) : '')
  const [frequency, setFrequency] = useState(settings.payFrequency || '')
  const [nextPayDate, setNextPayDate] = useState(settings.nextPayDate || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const parsed = parseIncomeSettings({ salary, frequency, nextPayDate })
      setSaving(true)
      await actions.setSetting('monthlySalaryMinor', parsed.monthlySalaryMinor)
      await actions.setSetting('payFrequency', parsed.payFrequency)
      await actions.setSetting('nextPayDate', parsed.nextPayDate)
      notify('Ingresos guardados')
    } catch (issue) {
      setError(issue.message)
    } finally {
      setSaving(false)
    }
  }

  return <section className="settings-group income-settings" id="ingresos">
    <h2>Ingresos</h2>
    <p className="settings-group__intro">Cuéntale a PataWallet cuánto recibes y cada cuánto te pagan. Es una referencia para organizarte; no crea ingresos automáticamente.</p>
    <form onSubmit={submit}>
      <Field label="Sueldo mensual equivalente" optional error={error}><input inputMode="decimal" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="2.500.000" /></Field>
      <Field label="¿Cada cuánto recibes tu pago?" optional><select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="">Elige una frecuencia</option>{PAY_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
      <Field label="Fecha de tu próximo pago" optional><input type="date" value={nextPayDate} onChange={(event) => setNextPayDate(event.target.value)} /></Field>
      <p className="helper">Si dejas ambos campos vacíos, se quitará esta referencia.</p>
      <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ingresos'}</button>
    </form>
  </section>
}

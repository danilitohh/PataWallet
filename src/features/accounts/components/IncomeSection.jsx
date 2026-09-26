import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../../../app/AppContext.jsx'
import { formatMinor, safeAdd } from '../../../domain/money.js'
import { monthInTimeZone } from '../../../domain/finance.js'
import { isCalendarDate } from '../../../domain/recurringExpenses.js'
import { currentMonth } from '../../../shared/lib/date.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { PAY_FREQUENCY_OPTIONS } from '../../settings/model/incomeSettings.js'
import { AccountSectionToggle, useAccountSectionExpansion } from './AccountSectionToggle.jsx'

// Muestra solo ingresos recibidos; la fecha del próximo pago es un recordatorio, no dinero disponible.
export function IncomeSection() {
  const { accounts, transactions, settings, actions, notify, setSheet } = useApp()
  const [expanded, setExpanded] = useAccountSectionExpansion('ingresos')
  const [frequency, setFrequency] = useState(settings.payFrequency || '')
  const [nextPayDate, setNextPayDate] = useState(settings.nextPayDate || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const month = currentMonth()
  const received = transactions.filter((item) => item.type === 'income' && item.status !== 'void' && monthInTimeZone(item.occurred_at) === month)
  const receivedMinor = received.reduce((total, item) => safeAdd(total, Number(item.amount_minor)), 0)
  const hasAccount = accounts.some((account) => account.kind === 'asset' && !account.archived)

  const saveSchedule = async (event) => {
    event.preventDefault()
    if (nextPayDate && !isCalendarDate(nextPayDate)) { setError('Elige una fecha válida.'); return }
    setError('')
    setSaving(true)
    try {
      await actions.setSetting('payFrequency', frequency || null)
      await actions.setSetting('nextPayDate', nextPayDate || null)
      notify('Próximo pago guardado')
    } catch (issue) { setError(issue.message) } finally { setSaving(false) }
  }

  return <section className="settings-group income-section" id="ingresos">
    <AccountSectionToggle sectionId="ingresos" title="Ingresos" description="Dinero que ya recibiste en tus cuentas." summary={formatMinor(receivedMinor, 'COP', settings.hiddenAmounts)} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
    {expanded && <div id="ingresos-content" className="account-section-toggle__content">
      <p className="settings-group__intro">Este mes recibiste {formatMinor(receivedMinor, 'COP', settings.hiddenAmounts)} en {received.length} movimiento{received.length === 1 ? '' : 's'}. Tu saldo actual también incluye el dinero que registraste al abrir tus cuentas.</p>
      <button className="button button--secondary" type="button" onClick={() => setSheet('income')} disabled={!hasAccount}><Plus /> Registrar dinero recibido</button>
      {!hasAccount && <p className="helper">Agrega primero una cuenta con tu saldo actual.</p>}
      <form onSubmit={saveSchedule}>
        <p className="helper">Si quieres, guarda cuándo esperas el próximo pago. No aumentará el saldo hasta que lo recibas y registres.</p>
        <Field label="Frecuencia de pago" optional><select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="">No indicar</option>{PAY_FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Próxima fecha de pago" optional><input type="date" value={nextPayDate} onChange={(event) => setNextPayDate(event.target.value)} /></Field>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button--quiet" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar fecha'}</button>
      </form>
    </div>}
  </section>
}

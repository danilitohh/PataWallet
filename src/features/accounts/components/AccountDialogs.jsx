import { useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { formatInputAmount, parseLocalizedAmount, toInputAmount } from '../../../domain/money.js'
import { DEBT_PAYMENT_FREQUENCIES, installmentsLimit, parseDebtSchedule, readDebtSchedule } from '../../../domain/debtSchedule.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { today } from '../../../shared/lib/date.js'
import { ACCOUNT_TYPE_OPTIONS, defaultAccountSubtype } from '../model/accountTypes.js'
import { fixedIncomeSummary, INCOME_SOURCE_TYPES, parseIncomeSources, readIncomeSources } from '../../settings/model/incomeSources.js'
import { PAY_FREQUENCY_OPTIONS } from '../../settings/model/incomeSettings.js'

export function AccountEditDialog({ account, close }) {
  const { notify, actions } = useApp()
  const [name, setName] = useState(account.name)
  const [schedule, setSchedule] = useState(scheduleValues(account))
  const [error, setError] = useState('')
  const [scheduleError, setScheduleError] = useState('')

  return (
    <SimpleDialog title="Editar cuenta" close={close}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        setScheduleError('')
        if (name.trim().length < 2) {
          setError('Escribe un nombre de al menos dos caracteres.')
          return
        }
        try {
          const debtSchedule = account.kind === 'liability' ? parseDebtSchedule(schedule) : parseDebtSchedule({})
          await actions.updateAccount(account.id, { name: name.trim(), ...(account.kind === 'liability' ? debtSchedule : {}) })
          notify('Cuenta actualizada')
          close()
        } catch (issue) {
          setScheduleError(issue.message)
        }
      }}>
        <Field label="Nombre" error={error}><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        {account.kind === 'liability' && <DebtScheduleFields values={schedule} onChange={setSchedule} error={scheduleError} />}
        <p className="helper">Cambiar el nombre no modifica saldos ni movimientos.</p>
        <button className="button button--primary" type="submit">Guardar cambios</button>
      </form>
    </SimpleDialog>
  )
}

export function AccountDialog({ close }) {
  const { accounts, settings, notify, actions } = useApp()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('asset')
  const [subtype, setSubtype] = useState(defaultAccountSubtype('asset'))
  const [amount, setAmount] = useState('')
  const [incomeType, setIncomeType] = useState('')
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeFrequency, setIncomeFrequency] = useState('')
  const [incomeNextPayDate, setIncomeNextPayDate] = useState('')
  const [schedule, setSchedule] = useState(emptySchedule())
  const [error, setError] = useState('')
  const [scheduleError, setScheduleError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setScheduleError('')
    try {
      if (name.trim().length < 2) throw new Error('Escribe un nombre para la cuenta.')
      const minor = amount.trim() ? parseLocalizedAmount(amount) : 0
      let debtSchedule
      try {
        debtSchedule = kind === 'liability' ? parseDebtSchedule(schedule) : parseDebtSchedule({})
      } catch (issue) {
        setScheduleError(issue.message)
        return
      }
      const id = makeId('account')
      const accountRecord = { id, name: name.trim(), kind, subtype, currency: 'COP', archived: false, ...(kind === 'liability' ? debtSchedule : {}) }
      const openingRecord = minor ? { id: makeId('transaction'), type: 'opening', amount_minor: minor, currency: 'COP', occurred_at: `${today()}T12:00:00-05:00`, from_account_id: null, to_account_id: id, category_id: null, merchant_name: null, note: 'Saldo inicial', source: 'manual', status: 'recorded' } : null
      const incomeSource = incomeType ? parseIncomeSources([{
        id: makeId('income'), name: incomeName.trim() || (incomeType === 'fixed_salary' ? 'Salario' : 'Ingreso extra'), type: incomeType,
        accountId: id, amount: incomeAmount, frequency: incomeFrequency, nextPayDate: incomeNextPayDate,
      }], [...accounts, accountRecord])[0] : null
      await actions.createAccount(accountRecord, openingRecord)
      if (incomeSource) await appendIncomeSource({ actions, settings, accounts, incomeSource })
      notify('Cuenta creada')
      close()
    } catch (issue) {
      setError(issue.message)
    }
  }

  return (
    <SimpleDialog title="Agregar cuenta" close={close}>
      <form onSubmit={submit}>
        <Field label="Nombre"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Cuenta de ahorro" /></Field>
        <Field label="Naturaleza"><select value={kind} onChange={(event) => { const nextKind = event.target.value; setKind(nextKind); setSubtype(defaultAccountSubtype(nextKind)); setSchedule(emptySchedule()); setScheduleError(''); if (nextKind === 'liability') { setIncomeType(''); setIncomeName(''); setIncomeAmount(''); setIncomeFrequency(''); setIncomeNextPayDate('') } }}><option value="asset">Dinero disponible</option><option value="liability">Deuda</option></select></Field>
        <Field label={kind === 'asset' ? 'Tipo de cuenta' : 'Tipo de deuda'}><select value={subtype} onChange={(event) => setSubtype(event.target.value)}>{ACCOUNT_TYPE_OPTIONS[kind].map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
        {/* Explica el efecto del tipo antes de pedir el saldo o la deuda inicial. */}
        <div className="account-type-guide" role="note"><strong>{kind === 'asset' ? 'Dinero que tienes' : 'Dinero que debes'}</strong><p>{kind === 'asset' ? 'Usa este tipo para efectivo, una cuenta bancaria o una billetera como Nequi. Una tarjeta débito pertenece a su cuenta bancaria.' : subtype === 'credit_card' ? 'Cada compra aumenta la deuda; pagarla reduce la deuda y el dinero de tu banco, sin duplicar el gasto.' : 'Registra aquí el capital que aún debes. Los pagos reducirán la deuda y el dinero de la cuenta desde la que pagues.'}</p></div>
        <Field label={kind === 'asset' ? 'Saldo inicial' : 'Deuda inicial'} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="0" /></Field>
        <p className="helper">El saldo inicial no cuenta como ingreso ni gasto.</p>
        {kind === 'asset' && <IncomeSourceFields values={{ type: incomeType, name: incomeName, amount: incomeAmount, frequency: incomeFrequency, nextPayDate: incomeNextPayDate }} onChange={({ type, name, amount: nextAmount, frequency, nextPayDate }) => { setIncomeType(type); setIncomeName(name); setIncomeAmount(nextAmount); setIncomeFrequency(frequency); setIncomeNextPayDate(nextPayDate) }} />}
        {kind === 'liability' && <DebtScheduleFields values={schedule} onChange={setSchedule} error={scheduleError} />}
        <button className="button button--primary" type="submit">Crear cuenta</button>
      </form>
    </SimpleDialog>
  )
}

// Conserva un estado vacío para no crear un plan de cuotas cuando el bloque opcional no se usa.
function emptySchedule() {
  return { total: '', paid: '', amount: '', frequency: '' }
}

// Ofrece registrar la fuente que llega a una cuenta de activo sin crear un movimiento automático.
function IncomeSourceFields({ values, onChange }) {
  const update = (key) => (event) => {
    const nextValue = key === 'amount' ? formatInputAmount(event.target.value) : event.target.value
    onChange({ ...values, [key]: nextValue })
  }
  const isFixed = values.type === 'fixed_salary'
  return <fieldset className="account-income-setup">
    <legend>Ingreso que recibes <small>Opcional</small></legend>
    <p className="helper">Puedes asociar esta cuenta a un sueldo fijo o a un ingreso extra. El pago real se registra después desde Nuevo movimiento.</p>
    <Field label="Tipo de ingreso"><select value={values.type} onChange={update('type')}><option value="">No registrar ahora</option>{INCOME_SOURCE_TYPES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
    {values.type && <><Field label="Nombre del ingreso"><input value={values.name} onChange={update('name')} placeholder={isFixed ? 'Salario' : 'Freelance o venta'} /></Field>{isFixed ? <><Field label="Sueldo mensual equivalente"><input inputMode="decimal" value={values.amount} onChange={update('amount')} placeholder="2.500.000" /></Field><Field label="¿Cada cuánto recibes tu pago?"><select value={values.frequency} onChange={update('frequency')}><option value="">Selecciona una frecuencia</option>{PAY_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field><Field label="Fecha de tu próximo pago" optional><input type="date" value={values.nextPayDate} onChange={update('nextPayDate')} /></Field></> : <Field label="Monto habitual" optional><input inputMode="decimal" value={values.amount} onChange={update('amount')} placeholder="0" /></Field>}</>}
  </fieldset>
}

// Añade la fuente nueva y actualiza las claves antiguas que consumen versiones previas de la interfaz.
async function appendIncomeSource({ actions, settings, accounts, incomeSource }) {
  const existing = readIncomeSources(settings.incomeSources, accounts)
  const sources = [...existing, incomeSource]
  const { salaryMinor, primary } = fixedIncomeSummary(sources)
  await actions.setSetting('incomeSources', sources)
  await actions.setSetting('monthlySalaryMinor', salaryMinor)
  await actions.setSetting('payFrequency', primary?.frequency || null)
  await actions.setSetting('nextPayDate', primary?.next_pay_date || null)
}

// Traduce el plan persistido a controles editables y mantiene compatibilidad con cuentas antiguas.
function scheduleValues(account) {
  const schedule = readDebtSchedule(account)
  if (!schedule) return emptySchedule()
  return { total: String(schedule.total), paid: String(schedule.paid), amount: toInputAmount(schedule.amount), frequency: schedule.frequency }
}

// Agrupa los campos opcionales que describen el calendario de una deuda sin generar pagos automáticos.
function DebtScheduleFields({ values, onChange, error }) {
  const update = (key) => (event) => onChange({ ...values, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value })
  return <fieldset className="account-debt-schedule">
    <legend>Plan de pago <small>Opcional</small></legend>
    <p className="helper">Sirve para llevar seguimiento. No crea movimientos ni cambia el saldo de la deuda.</p>
    <div className="form-grid">
      <Field label="Total de cuotas" error={error}><input type="number" inputMode="numeric" min="1" max={installmentsLimit()} step="1" value={values.total} onChange={update('total')} placeholder="12" /></Field>
      <Field label="Cuotas pagadas"><input type="number" inputMode="numeric" min="0" max={installmentsLimit()} step="1" value={values.paid} onChange={update('paid')} placeholder="0" /></Field>
      <Field label="Valor de cada cuota"><input inputMode="decimal" value={values.amount} onChange={update('amount')} placeholder="250.000" /></Field>
      <Field label="Cada cuánto la pagas"><select value={values.frequency} onChange={update('frequency')}><option value="">Elige una frecuencia</option>{DEBT_PAYMENT_FREQUENCIES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
    </div>
  </fieldset>
}

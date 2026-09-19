import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, WalletCards } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { calculateAvailableMoney } from '../../domain/finance.js'
import { fixedExpensesToInput, parseFixedExpenses } from '../../domain/financialSetup.js'
import { formatInputAmount, formatMinor, parseLocalizedAmount, toInputAmount } from '../../domain/money.js'
import { FIXED_EXPENSE_FREQUENCY_OPTIONS } from '../../domain/recurringExpenses.js'
import { Field } from '../../shared/components/Modal.jsx'
import { makeId } from '../../shared/lib/id.js'
import { today } from '../../shared/lib/date.js'
import { PetScene } from '../../components/PetScene.jsx'
import { PAY_FREQUENCY_OPTIONS, parseIncomeSettings, payFrequencyLabel } from '../settings/model/incomeSettings.js'
import { ACCOUNT_TYPE_OPTIONS } from '../accounts/model/accountTypes.js'

const STEP_LABELS = ['Ingresos', 'Deudas', 'Gastos fijos']
const NEW_ACCOUNT_OPTION = '__new_account__'

// Solicita los datos mínimos para construir un punto de partida financiero personalizado.
export function FinancialOnboarding() {
  const { accounts, transactions, settings, actions, notify } = useApp()
  const [step, setStep] = useState(0)
  const [salary, setSalary] = useState(settings.monthlySalaryMinor ? toInputAmount(settings.monthlySalaryMinor) : '')
  const [frequency, setFrequency] = useState(settings.payFrequency || '')
  const [nextPayDate, setNextPayDate] = useState(settings.nextPayDate || '')
  const [salaryAccountId, setSalaryAccountId] = useState('')
  const [salaryAccountName, setSalaryAccountName] = useState('')
  // Mantiene una identidad estable si el usuario reintenta guardar después de un fallo de red.
  const salaryAccountNewId = useRef(makeId('salary-account'))
  const [debts, setDebts] = useState([])
  const [fixedExpenses, setFixedExpenses] = useState(() => {
    const saved = fixedExpensesToInput(settings.fixedExpenses, { defaultDueDate: today() })
    return saved.length ? saved : [blankFixedExpense(today())]
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => buildPreview({ salary, frequency, nextPayDate, fixedExpenses, debts, accounts, transactions }), [salary, frequency, nextPayDate, fixedExpenses, debts, accounts, transactions])

  const next = () => {
    setError('')
    try {
      if (step === 0) {
        parseIncomeSettings({ salary, frequency, nextPayDate })
        parseSalaryAccountSelection({ salary, accountId: salaryAccountId, accountName: salaryAccountName, accounts })
      }
      if (step === 1) parseDebtDrafts(debts)
      setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1))
    } catch (issue) {
      setError(issue.message)
    }
  }

  const finish = async (event) => {
    event.preventDefault()
    setError('')
    if (saving) return
    setSaving(true)
    try {
      const income = parseIncomeSettings({ salary, frequency, nextPayDate })
      const salaryAccount = parseSalaryAccountSelection({ salary, accountId: salaryAccountId, accountName: salaryAccountName, accounts })
      const parsedFixedExpenses = parseFixedExpenses(fixedExpenses)
      const parsedDebts = parseDebtDrafts(debts)
      // Registra solo la cuenta de destino; no crea saldo inicial ni movimiento de salario.
      if (income.monthlySalaryMinor !== null && salaryAccount?.kind === 'new' && !accounts.some((account) => account.id === salaryAccountNewId.current)) {
        await actions.createAccount({ id: salaryAccountNewId.current, name: salaryAccount.name, kind: 'asset', subtype: 'bank', currency: 'COP', archived: false })
      }
      const incomeSources = income.monthlySalaryMinor === null ? [] : [{
        id: 'income-salary', name: 'Salario', type: 'fixed_salary', account_id: salaryAccount?.kind === 'existing' ? salaryAccount.id : salaryAccountNewId.current,
        amount_minor: income.monthlySalaryMinor, frequency: income.payFrequency, next_pay_date: income.nextPayDate,
      }]
      const nextDebts = [...debts]
      // Crea cada deuda como un pasivo con apertura; la apertura no se cuenta como ingreso ni gasto.
      for (const [index, debt] of parsedDebts.entries()) {
        if (nextDebts[index]?.accountId) continue
        const accountId = makeId('debt')
        await actions.createAccount(
          { id: accountId, name: debt.name, kind: 'liability', subtype: debt.subtype, currency: 'COP', archived: false, debt_monthly_payment_minor: debt.monthlyPaymentMinor },
          { id: makeId('transaction'), type: 'opening', amount_minor: debt.totalMinor, currency: 'COP', occurred_at: `${today()}T12:00:00-05:00`, from_account_id: null, to_account_id: accountId, category_id: null, merchant_name: null, note: 'Deuda inicial', source: 'manual', status: 'recorded' },
        )
        nextDebts[index] = { ...nextDebts[index], accountId }
      }
      setDebts(nextDebts)
      await actions.setSetting('incomeSources', incomeSources)
      await actions.setSetting('monthlySalaryMinor', income.monthlySalaryMinor)
      await actions.setSetting('payFrequency', income.payFrequency)
      await actions.setSetting('nextPayDate', income.nextPayDate)
      await actions.setSetting('fixedExpenses', parsedFixedExpenses)
      await actions.setSetting('financialOnboardingComplete', true)
      await actions.setSetting('entered', true)
      notify('Tu punto de partida quedó guardado')
    } catch (issue) {
      setError(issue.message || 'No pudimos guardar tu información. Tus datos no se han dado por terminados.')
      setSaving(false)
    }
  }

  return <main className="onboarding-page">
    <section className="onboarding-card" aria-labelledby="onboarding-title">
      <div className="onboarding-card__top"><div><p className="eyebrow">Tu punto de partida</p><h1 id="onboarding-title">Hagamos cuentas con calma.</h1></div><NightIcon icon={WalletCards} className="onboarding-card__mark" tone="violet" aria-hidden="true" /></div>
      <p className="onboarding-intro">Con estos datos estimaremos cuánto dinero puedes usar cada mes. Nada crea movimientos automáticos: tú decides qué registrar.</p>
      <div className="onboarding-progress" aria-label={`Paso ${step + 1} de ${STEP_LABELS.length}`}><div className="onboarding-progress__bar"><span style={{ '--progress-scale': (step + 1) / STEP_LABELS.length }} /></div><div>{STEP_LABELS.map((label, index) => <span className={index <= step ? 'is-active' : ''} key={label}>{index < step ? <Check aria-hidden="true" /> : index + 1} {label}</span>)}</div></div>
      {step === 0 && <IncomeStep salary={salary} frequency={frequency} nextPayDate={nextPayDate} salaryAccountId={salaryAccountId} salaryAccountName={salaryAccountName} accounts={accounts} setSalary={setSalary} setFrequency={setFrequency} setNextPayDate={setNextPayDate} setSalaryAccountId={setSalaryAccountId} setSalaryAccountName={setSalaryAccountName} error={error} />}
      {step === 1 && <DebtStep debts={debts} setDebts={setDebts} error={error} />}
      {step === 2 && <FixedExpensesStep fixedExpenses={fixedExpenses} setFixedExpenses={setFixedExpenses} preview={preview} error={error} />}
      <div className="onboarding-actions">
        {step > 0 && <button className="button button--secondary" type="button" onClick={() => { setError(''); setStep((current) => current - 1) }}><ArrowLeft /> Atrás</button>}
        {step < STEP_LABELS.length - 1 ? <button className="button button--primary" type="button" onClick={next}>Continuar <ArrowRight /></button> : <button className="button button--primary" type="button" onClick={finish} disabled={saving}>{saving ? 'Guardando…' : 'Ver mi dinero libre'} <ArrowRight /></button>}
      </div>
    </section>
    <div className="onboarding-art"><PetScene name="budget" /><p>Tu información se guarda en el espacio de esta cuenta.</p></div>
  </main>
}

// Recoge el salario mensual equivalente y la fecha de referencia para evaluar compras futuras.
function IncomeStep({ salary, frequency, nextPayDate, salaryAccountId, salaryAccountName, accounts, setSalary, setFrequency, setNextPayDate, setSalaryAccountId, setSalaryAccountName, error }) {
  const assetAccounts = accounts.filter((account) => account.kind === 'asset' && !account.archived)
  const creatingAccount = !assetAccounts.length || salaryAccountId === NEW_ACCOUNT_OPTION
  return <section className="onboarding-step">
    <p className="eyebrow">1 de 3 · Lo que recibes</p><h2>¿Con cuánto cuentas cada mes?</h2><p className="helper">Usaremos el valor mensual equivalente, aunque recibas tu pago por semanas o quincenas.</p>
    <Field label="Salario mensual equivalente" error={error}><div className="amount-input"><span>$</span><input autoFocus inputMode="decimal" value={salary} onChange={(event) => setSalary(formatInputAmount(event.target.value))} placeholder="2.500.000" /><small>COP</small></div></Field>
    <Field label="¿Cada cuánto recibes tu pago?"><select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="">Selecciona una frecuencia</option>{PAY_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
    <Field label="Fecha de tu próximo pago" optional><input type="date" min={today()} value={nextPayDate} onChange={(event) => setNextPayDate(event.target.value)} /></Field>
    <Field label="Cuenta donde recibes el salario" optional={!String(salary).trim()}>
      {assetAccounts.length > 0 && <select aria-label="Cuenta donde recibes el salario" value={salaryAccountId} onChange={(event) => { setSalaryAccountId(event.target.value); if (event.target.value !== NEW_ACCOUNT_OPTION) setSalaryAccountName('') }}>
        <option value="">Selecciona una cuenta</option>
        {assetAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
        <option value={NEW_ACCOUNT_OPTION}>Agregar otra cuenta…</option>
      </select>}
      {creatingAccount && <input aria-label="Nombre de la cuenta donde recibes el salario" value={salaryAccountName} onChange={(event) => setSalaryAccountName(event.target.value)} placeholder="Ahorros Bancolombia" />}
    </Field>
    <p className="info-note"><strong>{payFrequencyLabel(frequency) || 'Tu frecuencia de pago'}</strong><span> La cuenta solo queda disponible como destino. No crea saldo ni un ingreso automático; registra el pago real una sola vez en Nuevo movimiento.</span></p>
  </section>
}

// Registra deudas y sus pagos mensuales como compromisos informativos, sin inventar cobros.
function DebtStep({ debts, setDebts, error }) {
  const update = (id, key) => (event) => setDebts((rows) => rows.map((row) => row.id === id ? { ...row, [key]: ['amount', 'monthlyPayment'].includes(key) ? formatInputAmount(event.target.value) : event.target.value } : row))
  return <section className="onboarding-step">
    <p className="eyebrow">2 de 3 · Tus deudas</p><h2>¿Qué compromisos ya tienes?</h2><p className="helper">Anota el total pendiente y el pago mensual aproximado. Así no confundiremos deuda con un gasto nuevo.</p>
    <div className="onboarding-repeatable">{debts.map((row, index) => <div className="onboarding-repeatable__item" key={row.id}><div className="repeatable-heading"><strong>Deuda {index + 1}</strong>{!row.accountId && <button type="button" className="icon-button icon-button--small" aria-label={`Quitar deuda ${index + 1}`} onClick={() => setDebts((items) => items.filter((item) => item.id !== row.id))}><Trash2 /></button>}</div><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Tarjeta o préstamo" disabled={Boolean(row.accountId)} /></Field><div className="form-grid"><Field label="Total pendiente"><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="1.200.000" disabled={Boolean(row.accountId)} /></Field><Field label="Pago mensual"><input inputMode="decimal" value={row.monthlyPayment} onChange={update(row.id, 'monthlyPayment')} placeholder="100.000" disabled={Boolean(row.accountId)} /></Field></div><Field label="Tipo"><select value={row.subtype} onChange={update(row.id, 'subtype')} disabled={Boolean(row.accountId)}>{ACCOUNT_TYPE_OPTIONS.liability.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field></div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="button" className="button button--secondary" onClick={() => setDebts((items) => [...items, { id: makeId('debt-row'), name: '', amount: '', monthlyPayment: '', subtype: 'credit_card' }])}><Plus /> Agregar deuda</button>
    {!debts.length && <p className="empty-inline">Si no tienes deudas, continúa con el siguiente paso.</p>}
  </section>
}

// Recoge los compromisos mensuales que deben salir antes de considerar compras nuevas.
function FixedExpensesStep({ fixedExpenses, setFixedExpenses, preview, error }) {
  const update = (id, key) => (event) => setFixedExpenses((rows) => rows.map((row) => row.id === id ? { ...row, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value } : row))
  return <section className="onboarding-step">
    <p className="eyebrow">3 de 3 · Gastos fijos</p><h2>¿Qué pagos se repiten?</h2><p className="helper">Arriendo, internet, comida u otros compromisos. Elige cada cuánto ocurren para calcular sus vencimientos y tu dinero libre.</p>
    <div className="onboarding-repeatable">{fixedExpenses.map((row, index) => <div className="onboarding-repeatable__item" key={row.id}><div className="repeatable-heading"><strong>Gasto fijo {index + 1}</strong><button type="button" className="icon-button icon-button--small" aria-label={`Quitar gasto fijo ${index + 1}`} onClick={() => setFixedExpenses((items) => items.filter((item) => item.id !== row.id))}><Trash2 /></button></div><div className="form-grid"><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Internet o mercado" /></Field><Field label={row.frequency === 'monthly' ? 'Monto mensual' : 'Monto por pago'}><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="900.000" /></Field></div><div className="form-grid"><Field label="¿Cada cuánto se hace este pago?"><select value={row.frequency} onChange={update(row.id, 'frequency')}>{FIXED_EXPENSE_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field><Field label="Próxima fecha de pago"><input type="date" value={row.nextDueDate} onChange={update(row.id, 'nextDueDate')} /></Field></div></div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="button" className="button button--secondary" onClick={() => setFixedExpenses((items) => [...items, blankFixedExpense(today())])}><Plus /> Agregar gasto fijo</button>
    <AvailablePreview preview={preview} />
  </section>
}

function blankFixedExpense(nextDueDate) {
  // Prepara una fila mensual lista para completar y con una fecha de referencia visible.
  return { id: makeId('fixed'), name: '', amount: '', frequency: 'monthly', nextDueDate, paymentHistory: [] }
}

// Muestra el resultado estimado antes de guardar para que la persona entienda de dónde sale.
function AvailablePreview({ preview }) {
  const value = preview.monthlyFreeMinor
  return <div className={`onboarding-result ${value !== null && value < 0 ? 'onboarding-result--warning' : ''}`} aria-live="polite"><div><span>Dinero libre mensual estimado</span><strong>{value === null ? 'Completa tu salario' : formatMinor(value, 'COP')}</strong></div><p>{value === null ? 'Falta el salario mensual para completar el cálculo.' : `${formatMinor(preview.salaryMinor, 'COP')} − ${formatMinor(preview.fixedExpensesMinor, 'COP')} en gastos fijos − ${formatMinor(preview.debtPaymentsMinor, 'COP')} en pagos de deuda.`}</p></div>
}

// Valida y normaliza deudas nuevas antes de crear cuentas de tipo pasivo.
function parseDebtDrafts(rows) {
  return rows.map((row) => {
    if (row.accountId) return row
    const name = row.name.trim()
    if (name.length < 2) throw new Error('Escribe el nombre de cada deuda o quita la fila vacía.')
    const totalMinor = parseLocalizedAmount(row.amount)
    const monthlyPaymentMinor = parseLocalizedAmount(row.monthlyPayment)
    return { ...row, name, total: row.amount, totalMinor, monthlyPaymentMinor }
  })
}

// Valida la cuenta asociada al salario sin convertir el dato de referencia en un movimiento.
function parseSalaryAccountSelection({ salary, accountId, accountName, accounts }) {
  if (!String(salary ?? '').trim()) return null
  const selectedId = String(accountId ?? '').trim()
  const activeAssets = accounts.filter((account) => account.kind === 'asset' && !account.archived)
  if (selectedId && selectedId !== NEW_ACCOUNT_OPTION) {
    if (!activeAssets.some((account) => account.id === selectedId)) throw new Error('Selecciona una cuenta disponible para recibir tu salario.')
    return { kind: 'existing', id: selectedId }
  }
  const name = String(accountName ?? '').trim()
  if (name.length < 2) throw new Error('Indica la cuenta donde recibes tu salario o agrega una nueva.')
  if (activeAssets.some((account) => account.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Esa cuenta ya existe. Selecciónala de la lista para no duplicarla.')
  return { kind: 'new', name }
}

// Calcula una vista previa incluyendo las deudas que todavía están en el formulario.
function buildPreview({ salary, frequency, nextPayDate, fixedExpenses, debts, accounts, transactions }) {
  let monthlySalaryMinor = null
  try { monthlySalaryMinor = parseIncomeSettings({ salary, frequency }).monthlySalaryMinor } catch { /* El mensaje del formulario se muestra al continuar. */ }
  let parsedFixed = []
  try { parsedFixed = parseFixedExpenses(fixedExpenses) } catch { /* Se valida al guardar; no se bloquea la previsualización. */ }
  const previewDebts = debts.filter((row) => !row.accountId).flatMap((row) => {
    try { return [{ kind: 'liability', archived: false, debt_monthly_payment_minor: parseLocalizedAmount(row.monthlyPayment) }] } catch { return [] }
  })
  return calculateAvailableMoney({ monthlySalaryMinor, fixedExpenses: parsedFixed, accounts: [...accounts, ...previewDebts], transactions, month: today().slice(0, 7), payFrequency: frequency, nextPayDate })
}

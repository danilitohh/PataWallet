import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, WalletCards } from 'lucide-react'
import { useApp } from '../../app/AppContext.jsx'
import { NightIcon } from '../../shared/components/NightIcon.jsx'
import { fixedExpensesToInput, parseFixedExpenses } from '../../domain/financialSetup.js'
import { formatInputAmount, parseLocalizedAmount } from '../../domain/money.js'
import { FIXED_EXPENSE_FREQUENCY_OPTIONS } from '../../domain/recurringExpenses.js'
import { Field } from '../../shared/components/Modal.jsx'
import { makeId } from '../../shared/lib/id.js'
import { today } from '../../shared/lib/date.js'
import { PetScene } from '../../components/PetScene.jsx'
import { ACCOUNT_TYPE_OPTIONS } from '../accounts/model/accountTypes.js'

const STEP_LABELS = ['Dinero actual', 'Deudas', 'Pagos fijos']
const NEW_ACCOUNT_OPTION = '__new_account__'

// Solicita los datos mínimos para construir un punto de partida financiero personalizado.
export function FinancialOnboarding() {
  const { accounts, settings, actions, notify } = useApp()
  const [step, setStep] = useState(0)
  const [startingBalance, setStartingBalance] = useState('')
  const [startingAccountId, setStartingAccountId] = useState('')
  const [startingAccountName, setStartingAccountName] = useState('')
  // Mantiene una identidad estable si el usuario reintenta guardar después de un fallo de red.
  const startingAccountNewId = useRef(makeId('starting-account'))
  const openingId = useRef(makeId('opening'))
  const [debts, setDebts] = useState([])
  const [fixedExpenses, setFixedExpenses] = useState(() => {
    const saved = fixedExpensesToInput(settings.fixedExpenses, { defaultDueDate: today() })
    return saved.length ? saved : [blankFixedExpense(today())]
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const next = () => {
    setError('')
    try {
      if (step === 0) parseStartingAccount({ balance: startingBalance, accountId: startingAccountId, accountName: startingAccountName, accounts })
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
      const startingAccount = parseStartingAccount({ balance: startingBalance, accountId: startingAccountId, accountName: startingAccountName, accounts })
      const parsedFixedExpenses = parseFixedExpenses(fixedExpenses)
      const parsedDebts = parseDebtDrafts(debts)
      // El saldo inicial refleja dinero existente hoy; no se presenta como sueldo ni ingreso del mes.
      if (startingAccount.kind === 'new' && !accounts.some((account) => account.id === startingAccountNewId.current)) {
        await actions.createAccount(
          { id: startingAccountNewId.current, name: startingAccount.name, kind: 'asset', subtype: 'bank', currency: 'COP', archived: false },
          startingAccount.balanceMinor ? { id: openingId.current, type: 'opening', amount_minor: startingAccount.balanceMinor, currency: 'COP', occurred_at: `${today()}T12:00:00-05:00`, from_account_id: null, to_account_id: startingAccountNewId.current, category_id: null, merchant_name: null, note: 'Saldo actual al empezar', source: 'manual', status: 'recorded' } : null,
        )
      }
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
      <p className="onboarding-intro">Empezamos por el dinero que tienes hoy. Los pagos pendientes se muestran aparte y solo cambian el saldo cuando los registras.</p>
      <div className="onboarding-progress" aria-label={`Paso ${step + 1} de ${STEP_LABELS.length}`}><div className="onboarding-progress__bar"><span style={{ '--progress-scale': (step + 1) / STEP_LABELS.length }} /></div><div>{STEP_LABELS.map((label, index) => <span className={index <= step ? 'is-active' : ''} key={label}>{index < step ? <Check aria-hidden="true" /> : index + 1} {label}</span>)}</div></div>
      {step === 0 && <StartingAccountStep balance={startingBalance} accountId={startingAccountId} accountName={startingAccountName} accounts={accounts} setBalance={setStartingBalance} setAccountId={setStartingAccountId} setAccountName={setStartingAccountName} error={error} />}
      {step === 1 && <DebtStep debts={debts} setDebts={setDebts} error={error} />}
      {step === 2 && <FixedExpensesStep fixedExpenses={fixedExpenses} setFixedExpenses={setFixedExpenses} error={error} />}
      <div className="onboarding-actions">
        {step > 0 && <button className="button button--secondary" type="button" onClick={() => { setError(''); setStep((current) => current - 1) }}><ArrowLeft /> Atrás</button>}
        {step < STEP_LABELS.length - 1 ? <button className="button button--primary" type="button" onClick={next}>Continuar <ArrowRight /></button> : <button className="button button--primary" type="button" onClick={finish} disabled={saving}>{saving ? 'Guardando…' : 'Ver mi saldo'} <ArrowRight /></button>}
      </div>
    </section>
    <div className="onboarding-art"><PetScene name="budget" /><p>Tu información se guarda en el espacio de esta cuenta.</p></div>
  </main>
}

// Pide una cuenta y el dinero que realmente existe hoy, sin inferirlo de un sueldo previsto.
function StartingAccountStep({ balance, accountId, accountName, accounts, setBalance, setAccountId, setAccountName, error }) {
  const assetAccounts = accounts.filter((account) => account.kind === 'asset' && !account.archived)
  const creatingAccount = !assetAccounts.length || accountId === NEW_ACCOUNT_OPTION
  return <section className="onboarding-step">
    <p className="eyebrow">1 de 3 · Tu dinero hoy</p><h2>¿Dónde está tu dinero?</h2><p className="helper">Escribe lo que ves hoy en tu banco o tienes en efectivo, no el sueldo que esperas recibir.</p>
    <Field label="Cuenta con tu dinero" error={error}>
      {assetAccounts.length > 0 && <select aria-label="Cuenta con tu dinero" value={accountId} onChange={(event) => { setAccountId(event.target.value); if (event.target.value !== NEW_ACCOUNT_OPTION) setAccountName('') }}>
        <option value="">Selecciona una cuenta existente</option>
        {assetAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
        <option value={NEW_ACCOUNT_OPTION}>Agregar otra cuenta…</option>
      </select>}
      {creatingAccount && <input aria-label="Nombre de la cuenta" autoFocus value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Mi banco o efectivo" />}
    </Field>
    {creatingAccount && <Field label="Saldo que tienes hoy"><div className="amount-input"><span>$</span><input inputMode="decimal" value={balance} onChange={(event) => setBalance(formatInputAmount(event.target.value))} placeholder="0" /><small>COP</small></div></Field>}
    <p className="info-note">Este saldo inicial no se cuenta como un nuevo ingreso. Cuando recibas otro pago, regístralo una vez con «Recibí dinero».</p>
  </section>
}

// Registra deudas reales; los abonos se registran únicamente cuando ocurren.
function DebtStep({ debts, setDebts, error }) {
  const update = (id, key) => (event) => setDebts((rows) => rows.map((row) => row.id === id ? { ...row, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value } : row))
  return <section className="onboarding-step">
    <p className="eyebrow">2 de 3 · Tus deudas</p><h2>¿Qué debes hoy?</h2><p className="helper">Anota el saldo pendiente de cada deuda. Esto no crea un gasto ni un pago.</p>
    <div className="onboarding-repeatable">{debts.map((row, index) => <div className="onboarding-repeatable__item" key={row.id}><div className="repeatable-heading"><strong>Deuda {index + 1}</strong>{!row.accountId && <button type="button" className="icon-button icon-button--small" aria-label={`Quitar deuda ${index + 1}`} onClick={() => setDebts((items) => items.filter((item) => item.id !== row.id))}><Trash2 /></button>}</div><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Tarjeta o préstamo" disabled={Boolean(row.accountId)} /></Field><Field label="Total pendiente"><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="1.200.000" disabled={Boolean(row.accountId)} /></Field><Field label="Pago mensual previsto" optional><input inputMode="decimal" value={row.monthlyPayment || ''} onChange={update(row.id, 'monthlyPayment')} placeholder="100.000" disabled={Boolean(row.accountId)} /></Field><Field label="Tipo"><select value={row.subtype} onChange={update(row.id, 'subtype')} disabled={Boolean(row.accountId)}>{ACCOUNT_TYPE_OPTIONS.liability.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field></div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="button" className="button button--secondary" onClick={() => setDebts((items) => [...items, { id: makeId('debt-row'), name: '', amount: '', monthlyPayment: '', subtype: 'credit_card' }])}><Plus /> Agregar deuda</button>
    {!debts.length && <p className="empty-inline">Si no tienes deudas, continúa con el siguiente paso.</p>}
  </section>
}

// Recoge los compromisos mensuales que deben salir antes de considerar compras nuevas.
function FixedExpensesStep({ fixedExpenses, setFixedExpenses, error }) {
  const update = (id, key) => (event) => setFixedExpenses((rows) => rows.map((row) => row.id === id ? { ...row, [key]: key === 'amount' ? formatInputAmount(event.target.value) : event.target.value } : row))
  return <section className="onboarding-step">
    <p className="eyebrow">3 de 3 · Pagos fijos</p><h2>¿Qué pagos se repiten?</h2><p className="helper">Arriendo, internet, comida u otros compromisos. Cada uno se descontará del saldo solo cuando registres el pago.</p>
    <div className="onboarding-repeatable">{fixedExpenses.map((row, index) => <div className="onboarding-repeatable__item" key={row.id}><div className="repeatable-heading"><strong>Gasto fijo {index + 1}</strong><button type="button" className="icon-button icon-button--small" aria-label={`Quitar gasto fijo ${index + 1}`} onClick={() => setFixedExpenses((items) => items.filter((item) => item.id !== row.id))}><Trash2 /></button></div><div className="form-grid"><Field label="Nombre"><input value={row.name} onChange={update(row.id, 'name')} placeholder="Internet o mercado" /></Field><Field label={row.frequency === 'monthly' ? 'Monto mensual' : 'Monto por pago'}><input inputMode="decimal" value={row.amount} onChange={update(row.id, 'amount')} placeholder="900.000" /></Field></div><div className="form-grid"><Field label="¿Cada cuánto se hace este pago?"><select value={row.frequency} onChange={update(row.id, 'frequency')}>{FIXED_EXPENSE_FREQUENCY_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field><Field label="Próxima fecha de pago"><input type="date" value={row.nextDueDate} onChange={update(row.id, 'nextDueDate')} /></Field></div></div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="button" className="button button--secondary" onClick={() => setFixedExpenses((items) => [...items, blankFixedExpense(today())])}><Plus /> Agregar gasto fijo</button>
    <p className="info-note">El saldo de tu cuenta no cambiará al guardar estos compromisos. Verás los pagos pendientes por separado.</p>
  </section>
}

function blankFixedExpense(nextDueDate) {
  // Prepara una fila mensual lista para completar y con una fecha de referencia visible.
  return { id: makeId('fixed'), name: '', amount: '', frequency: 'monthly', nextDueDate, paymentHistory: [] }
}

// Valida y normaliza deudas nuevas antes de crear cuentas de tipo pasivo.
function parseDebtDrafts(rows) {
  return rows.map((row) => {
    if (row.accountId) return row
    const name = row.name.trim()
    if (name.length < 2) throw new Error('Escribe el nombre de cada deuda o quita la fila vacía.')
    const totalMinor = parseLocalizedAmount(row.amount)
    const monthlyPaymentMinor = row.monthlyPayment ? parseLocalizedAmount(row.monthlyPayment) : 0
    return { ...row, name, totalMinor, monthlyPaymentMinor }
  })
}

// Valida el saldo real o reutiliza una cuenta existente sin crear un ingreso ficticio.
function parseStartingAccount({ balance, accountId, accountName, accounts }) {
  const selectedId = String(accountId ?? '').trim()
  const activeAssets = accounts.filter((account) => account.kind === 'asset' && !account.archived)
  if (selectedId && selectedId !== NEW_ACCOUNT_OPTION) {
    if (!activeAssets.some((account) => account.id === selectedId)) throw new Error('Selecciona una cuenta donde tengas dinero.')
    return { kind: 'existing', id: selectedId }
  }
  const name = String(accountName ?? '').trim()
  if (name.length < 2) throw new Error('Escribe el nombre de la cuenta donde está tu dinero.')
  if (activeAssets.some((account) => account.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Esa cuenta ya existe. Selecciónala de la lista para no duplicarla.')
  if (!String(balance ?? '').trim()) throw new Error('Escribe el saldo que tienes hoy. Si está vacío, escribe 0.')
  return { kind: 'new', name, balanceMinor: /^0(?:,0{1,2})?$/.test(balance) ? 0 : parseLocalizedAmount(balance) }
}

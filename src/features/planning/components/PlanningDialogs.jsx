import { useRef, useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { calculateSummary } from '../../../domain/finance.js'
import { formatInputAmount, parseLocalizedAmount, toInputAmount } from '../../../domain/money.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { currentMonth, today } from '../../../shared/lib/date.js'

export function BudgetDialog({ budget, month, close }) {
  const { notify, actions } = useApp()
  return (
    <SimpleDialog title="Editar presupuesto" close={close}>
      <MoneyAction initial={budget?.limit_minor} label="Límite mensual" button="Guardar límite" onSubmit={async (amount) => {
        await actions.saveBudget({ month, limit_minor: amount })
        close()
        notify('Presupuesto actualizado')
      }} />
    </SimpleDialog>
  )
}

function MoneyAction({ initial = 0, label, button, onSubmit }) {
  const [amount, setAmount] = useState(initial ? toInputAmount(initial) : '')
  const [error, setError] = useState('')
  return <form onSubmit={async (event) => { event.preventDefault(); try { await onSubmit(parseLocalizedAmount(amount)) } catch (issue) { setError(issue.message) } }}><Field label={label} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="0" /></Field><button className="button button--primary" type="submit">{button}</button></form>
}

export function GoalDialog({ close }) {
  const { notify, actions } = useApp()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  // Bloquea envíos repetidos mientras la meta se guarda localmente o en servidor.
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  return (
    <SimpleDialog title="Nueva meta" close={close}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        if (savingRef.current) return
        savingRef.current = true
        setSaving(true)
        try {
          if (name.trim().length < 2) throw new Error('Escribe un nombre para la meta.')
          await actions.createGoal({ id: makeId('goal'), name: name.trim(), target_minor: parseLocalizedAmount(amount), currency: 'COP', completed_seen: false })
          notify('Meta creada')
          close()
        } catch (issue) {
          setError(issue.message)
          savingRef.current = false
          setSaving(false)
        }
      }}>
        <Field label="Nombre"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Monto objetivo" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="2.000.000" /></Field>
        <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear meta'}</button>
      </form>
    </SimpleDialog>
  )
}

export function AllocationDialog({ goal, close, onComplete }) {
  return <SimpleDialog title={`Reservar para ${goal.name}`} close={close}>
    <div className="allocation-explainer">
      <strong>¿Qué significa reservar?</strong>
      <p>Es marcar una parte de tu saldo para esta meta. No mueve dinero, no crea un gasto y no cambia el saldo de tu cuenta.</p>
      <p><b>Ejemplo:</b> si tienes $1.000.000 y reservas $200.000 para un viaje, tu cuenta sigue mostrando $1.000.000 y la meta muestra $200.000 de $500.000.</p>
    </div>
    <AllocationForm goal={goal} close={close} onComplete={onComplete} />
  </SimpleDialog>
}

function AllocationForm({ goal, close, onComplete }) {
  const { accounts, transactions, allocations, notify, actions } = useApp()
  const [account, setAccount] = useState(accounts.find((item) => item.kind === 'asset')?.id || '')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    try {
      const minor = parseLocalizedAmount(amount)
      const allocatedForAccount = allocations.filter((item) => item.account_id === account).reduce((sum, item) => sum + Number(item.amount_minor), 0)
      const reservedForGoal = allocations.filter((item) => item.goal_id === goal.id).reduce((sum, item) => sum + Number(item.amount_minor), 0)
      const summary = calculateSummary(accounts, transactions, currentMonth())
      if (allocatedForAccount + minor > (summary.balances[account] || 0)) throw new Error('Esta reserva no está cubierta por el saldo registrado de la cuenta.')
      const completedGoalId = !goal.completed_seen && reservedForGoal + minor >= Number(goal.target_minor) ? goal.id : null
      await actions.addAllocation({ id: makeId('allocation'), goal_id: goal.id, account_id: account, amount_minor: minor, allocated_on: today() }, completedGoalId)
      notify('Reserva actualizada')
      close()
      if (!goal.completed_seen && reservedForGoal + minor >= Number(goal.target_minor)) onComplete()
    } catch (issue) {
      setError(issue.message)
    }
  }

  return (
    <form onSubmit={submit}>
      <Field label="Cuenta"><select value={account} onChange={(event) => setAccount(event.target.value)}>{accounts.filter((item) => item.kind === 'asset' && !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Monto" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="300.000" /></Field>
      <p className="helper">Reservar no mueve dinero ni modifica el saldo de la cuenta.</p>
      <button className="button button--primary" type="submit">Crear reserva</button>
    </form>
  )
}

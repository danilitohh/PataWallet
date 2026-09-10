import { useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { db, makeId } from '../../../data/db.js'
import { calculateSummary } from '../../../domain/finance.js'
import { parseLocalizedAmount, toInputAmount } from '../../../domain/money.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { currentMonth, today } from '../../../shared/lib/date.js'

export function BudgetDialog({ budget, month, close }) {
  const { notify } = useApp()
  return (
    <SimpleDialog title="Editar presupuesto" close={close}>
      <MoneyAction initial={budget?.limit_minor} label="Límite mensual" button="Guardar límite" onSubmit={async (amount) => {
        await db.budgets.put({ month, limit_minor: amount })
        close()
        notify('Presupuesto actualizado')
      }} />
    </SimpleDialog>
  )
}

function MoneyAction({ initial = 0, label, button, onSubmit }) {
  const [amount, setAmount] = useState(initial ? toInputAmount(initial) : '')
  const [error, setError] = useState('')
  return <form onSubmit={async (event) => { event.preventDefault(); try { await onSubmit(parseLocalizedAmount(amount)) } catch (issue) { setError(issue.message) } }}><Field label={label} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></Field><button className="button button--primary" type="submit">{button}</button></form>
}

export function GoalDialog({ close }) {
  const { notify } = useApp()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  return (
    <SimpleDialog title="Nueva meta" close={close}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        try {
          if (name.trim().length < 2) throw new Error('Escribe un nombre para la meta.')
          await db.goals.add({ id: makeId('goal'), name: name.trim(), target_minor: parseLocalizedAmount(amount), currency: 'COP', completed_seen: false })
          notify('Meta creada')
          close()
        } catch (issue) {
          setError(issue.message)
        }
      }}>
        <Field label="Nombre"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Monto objetivo" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="2.000.000" /></Field>
        <button className="button button--primary" type="submit">Crear meta</button>
      </form>
    </SimpleDialog>
  )
}

export function AllocationDialog({ goal, close, onComplete }) {
  return <SimpleDialog title={`Reservar para ${goal.name}`} close={close}><AllocationForm goal={goal} close={close} onComplete={onComplete} /></SimpleDialog>
}

function AllocationForm({ goal, close, onComplete }) {
  const { accounts, allocations, notify } = useApp()
  const [account, setAccount] = useState(accounts.find((item) => item.kind === 'asset')?.id || '')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    try {
      const minor = parseLocalizedAmount(amount)
      const allocatedForAccount = allocations.filter((item) => item.account_id === account).reduce((sum, item) => sum + Number(item.amount_minor), 0)
      const reservedForGoal = allocations.filter((item) => item.goal_id === goal.id).reduce((sum, item) => sum + Number(item.amount_minor), 0)
      const transactions = await db.transactions.toArray()
      const summary = calculateSummary(accounts, transactions, currentMonth())
      if (allocatedForAccount + minor > (summary.balances[account] || 0)) throw new Error('Esta reserva no está cubierta por el saldo registrado de la cuenta.')
      await db.transaction('rw', db.allocations, db.goals, async () => {
        await db.allocations.add({ id: makeId('allocation'), goal_id: goal.id, account_id: account, amount_minor: minor, allocated_on: today() })
        if (!goal.completed_seen && reservedForGoal + minor >= Number(goal.target_minor)) await db.goals.update(goal.id, { completed_seen: true })
      })
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
      <Field label="Monto" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="300.000" /></Field>
      <p className="helper">Reservar no mueve dinero ni modifica el saldo de la cuenta.</p>
      <button className="button button--primary" type="submit">Crear reserva</button>
    </form>
  )
}

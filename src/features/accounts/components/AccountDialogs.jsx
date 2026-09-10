import { useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { db, makeId } from '../../../data/db.js'
import { parseLocalizedAmount } from '../../../domain/money.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { today } from '../../../shared/lib/date.js'

export function AccountEditDialog({ account, close }) {
  const { notify } = useApp()
  const [name, setName] = useState(account.name)
  const [error, setError] = useState('')

  return (
    <SimpleDialog title="Editar cuenta" close={close}>
      <form onSubmit={async (event) => {
        event.preventDefault()
        if (name.trim().length < 2) {
          setError('Escribe un nombre de al menos dos caracteres.')
          return
        }
        await db.accounts.update(account.id, { name: name.trim() })
        notify('Cuenta actualizada')
        close()
      }}>
        <Field label="Nombre" error={error}><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <p className="helper">Cambiar el nombre no modifica saldos ni movimientos.</p>
        <button className="button button--primary" type="submit">Guardar nombre</button>
      </form>
    </SimpleDialog>
  )
}

export function AccountDialog({ close }) {
  const { notify } = useApp()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('asset')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    try {
      if (name.trim().length < 2) throw new Error('Escribe un nombre para la cuenta.')
      const minor = amount.trim() ? parseLocalizedAmount(amount) : 0
      const id = makeId('account')
      await db.transaction('rw', db.accounts, db.transactions, async () => {
        await db.accounts.add({ id, name: name.trim(), kind, subtype: kind === 'liability' ? 'credit_card' : 'bank', currency: 'COP', archived: false })
        if (minor) await db.transactions.add({ id: makeId('transaction'), type: 'opening', amount_minor: minor, currency: 'COP', occurred_at: `${today()}T12:00:00-05:00`, from_account_id: null, to_account_id: id, category_id: null, merchant_name: null, note: 'Saldo inicial', source: 'manual', status: 'recorded' })
      })
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
        <Field label="Tipo"><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="asset">Dinero disponible</option><option value="liability">Tarjeta de crédito</option></select></Field>
        <Field label={kind === 'asset' ? 'Saldo inicial' : 'Deuda inicial'} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></Field>
        <p className="helper">El saldo inicial no cuenta como ingreso ni gasto.</p>
        <button className="button button--primary" type="submit">Crear cuenta</button>
      </form>
    </SimpleDialog>
  )
}

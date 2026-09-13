import { useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { parseLocalizedAmount } from '../../../domain/money.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { today } from '../../../shared/lib/date.js'
import { ACCOUNT_TYPE_OPTIONS, defaultAccountSubtype } from '../model/accountTypes.js'

export function AccountEditDialog({ account, close }) {
  const { notify, actions } = useApp()
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
        await actions.updateAccount(account.id, { name: name.trim() })
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
  const { notify, actions } = useApp()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('asset')
  const [subtype, setSubtype] = useState(defaultAccountSubtype('asset'))
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    try {
      if (name.trim().length < 2) throw new Error('Escribe un nombre para la cuenta.')
      const minor = amount.trim() ? parseLocalizedAmount(amount) : 0
      const id = makeId('account')
      const accountRecord = { id, name: name.trim(), kind, subtype, currency: 'COP', archived: false }
      const openingRecord = minor ? { id: makeId('transaction'), type: 'opening', amount_minor: minor, currency: 'COP', occurred_at: `${today()}T12:00:00-05:00`, from_account_id: null, to_account_id: id, category_id: null, merchant_name: null, note: 'Saldo inicial', source: 'manual', status: 'recorded' } : null
      await actions.createAccount(accountRecord, openingRecord)
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
        <Field label="Naturaleza"><select value={kind} onChange={(event) => { const nextKind = event.target.value; setKind(nextKind); setSubtype(defaultAccountSubtype(nextKind)) }}><option value="asset">Dinero disponible</option><option value="liability">Deuda</option></select></Field>
        <Field label={kind === 'asset' ? 'Tipo de cuenta' : 'Tipo de deuda'}><select value={subtype} onChange={(event) => setSubtype(event.target.value)}>{ACCOUNT_TYPE_OPTIONS[kind].map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field>
        {/* Explica el efecto del tipo antes de pedir el saldo o la deuda inicial. */}
        <div className="account-type-guide" role="note"><strong>{kind === 'asset' ? 'Dinero que tienes' : 'Dinero que debes'}</strong><p>{kind === 'asset' ? 'Usa este tipo para efectivo, una cuenta bancaria o una billetera como Nequi. Una tarjeta débito pertenece a su cuenta bancaria.' : subtype === 'credit_card' ? 'Cada compra aumenta la deuda; pagarla reduce la deuda y el dinero de tu banco, sin duplicar el gasto.' : 'Registra aquí el capital que aún debes. Los pagos reducirán la deuda y el dinero de la cuenta desde la que pagues.'}</p></div>
        <Field label={kind === 'asset' ? 'Saldo inicial' : 'Deuda inicial'} error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></Field>
        <p className="helper">El saldo inicial no cuenta como ingreso ni gasto.</p>
        <button className="button button--primary" type="submit">Crear cuenta</button>
      </form>
    </SimpleDialog>
  )
}

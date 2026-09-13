import { useRef, useState } from 'react'
import { useApp } from '../../../app/AppContext.jsx'
import { formatInputAmount, parseLocalizedAmount, toInputAmount } from '../../../domain/money.js'
import { Field, SimpleDialog } from '../../../shared/components/Modal.jsx'
import { today } from '../../../shared/lib/date.js'
import { makeId } from '../../../shared/lib/id.js'

export function PlannedPurchaseDialog({ purchase, close }) {
  const { categories, actions, notify } = useApp()
  const [name, setName] = useState(purchase?.name || '')
  const [amount, setAmount] = useState(purchase ? toInputAmount(purchase.amount_minor) : '')
  const [targetDate, setTargetDate] = useState(purchase?.target_date || today())
  const [categoryId, setCategoryId] = useState(purchase?.category_id || '')
  const [note, setNote] = useState(purchase?.note || '')
  const [error, setError] = useState('')
  // Mantiene una sola identidad por apertura del diálogo para que reintentos no dupliquen filas.
  const purchaseIdRef = useRef(purchase?.id || makeId('planned'))
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  // Valida y persiste una compra; el cerrojo evita dos escrituras por doble toque.
  const submit = async (event) => {
    event.preventDefault()
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      const clean = name.trim()
      if (clean.length < 2) throw new Error('Escribe qué quieres comprar.')
      await actions.savePlannedPurchase({ id: purchaseIdRef.current, name: clean, amount_minor: parseLocalizedAmount(amount), currency: 'COP', target_date: targetDate, category_id: categoryId || null, note: note.trim(), status: purchase?.status || 'planned', version: purchase?.version || 1, updated_at: new Date().toISOString() })
      notify(purchase ? 'Próxima compra actualizada' : 'Próxima compra guardada')
      close()
    } catch (issue) {
      setError(issue.message)
      savingRef.current = false
      setSaving(false)
    }
  }

  return <SimpleDialog title={purchase ? 'Editar próxima compra' : 'Agregar próxima compra'} close={close}>
    <form onSubmit={submit}>
      <Field label="Compra"><input autoFocus value={name} maxLength="80" onChange={(event) => setName(event.target.value)} placeholder="Ej. Computador" /></Field>
      <Field label="Monto estimado" error={error}><input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="2.000.000" /></Field>
      <div className="form-grid"><Field label="Fecha prevista"><input type="date" min={today()} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></Field><Field label="Categoría" optional><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Sin categoría</option>{categories.filter((item) => item.type === 'expense').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
      <Field label="Nota" optional><input value={note} maxLength="240" onChange={(event) => setNote(event.target.value)} /></Field>
      <p className="helper">Esto no crea un gasto ni reserva dinero. Sirve para planear y comparar.</p>
      <button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar próxima compra'}</button>
    </form>
  </SimpleDialog>
}

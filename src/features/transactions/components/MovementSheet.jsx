import { useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { z } from 'zod'
import { useApp } from '../../../app/AppContext.jsx'
import { makeId } from '../../../shared/lib/id.js'
import { formatInputAmount, parseLocalizedAmount, toInputAmount } from '../../../domain/money.js'
import { Field } from '../../../shared/components/Modal.jsx'
import { useModalBehavior } from '../../../shared/hooks/useModalBehavior.js'
import { today } from '../../../shared/lib/date.js'
import { labelForType } from '../model/transactionTypes.js'
import { CategoryDialog } from '../../../shared/components/CategoryDialog.jsx'

// Explica el efecto contable de cada opción justo donde la persona elige el tipo.
const MOVEMENT_TYPE_HELP = {
  expense: { title: 'Gasto', body: 'Sale de una cuenta y suma a tus gastos del mes.' },
  income: { title: 'Ingreso', body: 'Llega a una cuenta y suma a tus ingresos del mes.' },
  transfer: { title: 'Transferencia', body: 'Mueve dinero entre tus cuentas. No cuenta como ingreso ni gasto; si eliges una deuda como destino, se registra como pago de deuda.' },
}

const movementSchema = z.object({
  amount: z.string().min(1),
  account: z.string().min(1),
  destination: z.string().optional(),
  category: z.string().optional(),
  date: z.string().min(10),
})

export function MovementSheet({ transaction, onClose }) {
  const { accounts, categories, notify, actions } = useApp()
  const editing = Boolean(transaction)
  const initialType = transaction?.type === 'card_payment' ? 'transfer' : transaction?.type || 'expense'
  const [type, setType] = useState(initialType)
  const assets = accounts.filter((item) => item.kind === 'asset' && !item.archived)
  const activeAccounts = accounts.filter((item) => !item.archived)
  const [amount, setAmount] = useState(transaction ? toInputAmount(transaction.amount_minor) : '')
  const [account, setAccount] = useState(transaction?.from_account_id || (type === 'income' ? '' : activeAccounts[0]?.id) || '')
  const [destination, setDestination] = useState(transaction?.to_account_id || assets[0]?.id || '')
  const [category, setCategory] = useState(transaction?.category_id || '')
  const [date, setDate] = useState(transaction?.occurred_at?.slice(0, 10) || today())
  const existingClock = transaction?.occurred_at ? new Date(transaction.occurred_at).toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : ''
  const [time, setTime] = useState(existingClock === '12:00' ? '' : existingClock)
  const [note, setNote] = useState(transaction?.note || transaction?.merchant_name || '')
  const existingReceipt = useApp().receipts?.find((item) => item.transaction_id === transaction?.id)
  const [receipt, setReceipt] = useState(existingReceipt?.data_url || '')
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)
  useModalBehavior(dialogRef, onClose)
  const visibleCategories = categories.filter((item) => item.type === type)
  const typeHelp = MOVEMENT_TYPE_HELP[type]

  const deleteTransaction = async () => {
    if (!confirm('¿Eliminar este movimiento? Podrás deshacerlo durante unos segundos.')) return
    const backup = { ...transaction }
    await actions.deleteTransaction(transaction.id)
    notify('Movimiento eliminado', async () => {
      await actions.restoreTransaction(backup)
      notify('Movimiento restaurado')
    })
    onClose()
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      movementSchema.parse({ amount, account: type === 'income' ? destination : account, destination, category, date })
      const minor = parseLocalizedAmount(amount)
      if (type === 'transfer' && account === destination) throw new Error('Elige cuentas diferentes para la transferencia.')
      if ((type === 'expense' || type === 'income') && !category) throw new Error('Elige una categoría.')
      const destinationAccount = accounts.find((item) => item.id === destination)
      const storedType = type === 'transfer' && destinationAccount?.kind === 'liability' ? 'card_payment' : type
      const record = {
        id: transaction?.id || makeId('transaction'),
        type: storedType,
        amount_minor: minor,
        currency: 'COP',
        occurred_at: `${date}T${time || '12:00'}:00-05:00`,
        from_account_id: type === 'income' ? null : account,
        to_account_id: type === 'expense' ? null : destination,
        category_id: ['expense', 'income'].includes(type) ? category : null,
        merchant_name: note.trim() || null,
        note: note.trim(),
        source: transaction?.source || 'manual',
        status: 'recorded',
        updated_at: new Date().toISOString(),
      }
      await actions.saveTransaction(record)
      if (receipt) await actions.saveReceipt({ transaction_id: record.id, data_url: receipt, saved_at: new Date().toISOString(), sync_status: 'device_only' })
      else if (existingReceipt) await actions.deleteReceipt(record.id)
      notify(editing ? 'Movimiento actualizado' : 'Movimiento guardado', !editing ? async () => {
        await actions.deleteTransaction(record.id)
        notify('Movimiento deshecho')
      } : null)
      onClose()
    } catch (issue) {
      setError(issue instanceof z.ZodError ? 'Completa los campos obligatorios.' : issue.message)
    }
  }

  return (
    <motion.div className="sheet-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <motion.section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="movement-title" className="sheet" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
        <header><div><p className="eyebrow">{editing ? 'Editar' : 'Registrar'}</p><h2 id="movement-title">{editing ? 'Detalle del movimiento' : 'Nuevo movimiento'}</h2></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X /></button></header>
        <form onSubmit={submit}>
          <div className="segmented" aria-label="Tipo de movimiento">{['expense', 'income', 'transfer'].map((item) => <button type="button" key={item} aria-pressed={type === item} className={type === item ? 'active' : ''} onClick={() => { setType(item); setCategory(''); if (item === 'income') setDestination(assets[0]?.id || '') }}>{labelForType[item]}</button>)}</div>
          <div className="info-note movement-type-help" role="note" aria-live="polite"><strong>{typeHelp.title}</strong><span>{typeHelp.body}</span></div>
          <Field label="Monto" error={error}><div className="amount-input"><span>$</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="0" aria-describedby={error ? 'movement-error' : undefined} /><small>COP</small></div></Field>
          {type !== 'income' && <Field label={type === 'transfer' ? 'Desde' : 'Cuenta'}><select value={account} onChange={(event) => setAccount(event.target.value)}>{(type === 'transfer' ? assets : activeAccounts).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
          {type !== 'expense' && <Field label={type === 'income' ? 'Recibir en' : 'Hacia'}><select value={destination} onChange={(event) => setDestination(event.target.value)}>{(type === 'income' ? assets : activeAccounts.filter((item) => item.id !== account)).map((item) => <option key={item.id} value={item.id}>{item.name}{item.kind === 'liability' ? ' (pago de deuda)' : ''}</option>)}</select></Field>}
          {type !== 'transfer' && <div className="field"><span>Categoría</span><div className="input-with-action"><select aria-label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecciona una categoría</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="icon-button" aria-label="Crear categoría" onClick={() => setCategoryDialog(true)}><Plus /></button></div></div>}
          <div className="form-grid"><Field label="Fecha"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Hora" optional><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field></div>
          <Field label="Comercio o nota" optional><input value={note} onChange={(event) => setNote(event.target.value)} maxLength="120" placeholder="Opcional" /></Field>
          <Field label="Foto del comprobante" optional><label className="receipt-picker"><ImagePlus /><span>{receipt ? 'Cambiar imagen' : 'Añadir screenshot o foto'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readReceipt(event.target.files?.[0], setReceipt, setError)} /></label>{receipt && <div className="receipt-preview"><img src={receipt} alt="Vista previa del comprobante" /><button type="button" className="button button--quiet" onClick={() => setReceipt('')}>Quitar</button><small>Se conserva de forma privada en este dispositivo.</small></div>}</Field>
          {type === 'transfer' && accounts.find((item) => item.id === destination)?.kind === 'liability' && <p className="info-note">Se guardará como pago de deuda. Reduce el activo y el pasivo, sin crear otro gasto.</p>}
          <div className="sheet__actions">{editing && <button type="button" className="button button--danger" onClick={deleteTransaction}><Trash2 /> Eliminar</button>}<button className="button button--primary" type="submit">{editing ? 'Guardar cambios' : 'Guardar movimiento'}</button></div>
        </form>
      </motion.section>
      {categoryDialog && <CategoryDialog type={type} close={() => setCategoryDialog(false)} onCreated={setCategory} />}
    </motion.div>
  )
}

function readReceipt(file, setReceipt, setError) {
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('El comprobante debe ser JPG, PNG o WebP.')
  if (file.size > 2 * 1024 * 1024) return setError('La imagen debe pesar máximo 2 MB.')
  const reader = new FileReader()
  reader.onload = () => setReceipt(String(reader.result))
  reader.onerror = () => setError('No pudimos leer la imagen.')
  reader.readAsDataURL(file)
}

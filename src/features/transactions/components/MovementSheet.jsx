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
import { CategoryDialog } from '../../../shared/components/CategoryDialog.jsx'
import { AccountDialog } from '../../accounts/components/AccountDialogs.jsx'

// Nombra las acciones como las vive el usuario; el tipo contable se decide al guardar.
const MOVEMENT_CHOICES = [
  { id: 'expense', label: 'Hice una compra' },
  { id: 'income', label: 'Recibí dinero' },
  { id: 'debt', label: 'Pagué una deuda' },
  { id: 'transfer', label: 'Moví dinero' },
]

const movementSchema = z.object({
  amount: z.string().min(1),
  account: z.string().optional(),
  destination: z.string().optional(),
  category: z.string().optional(),
  date: z.string().min(10),
})

export function MovementSheet({ transaction, onClose }) {
  const { accounts, categories, notify, actions } = useApp()
  const editing = Boolean(transaction)
  const initialFlow = transaction?.type === 'card_payment' ? 'debt' : transaction?.type || 'expense'
  const [flow, setFlow] = useState(initialFlow)
  const type = flow === 'debt' ? 'transfer' : flow
  const assets = accounts.filter((item) => item.kind === 'asset' && !item.archived)
  const activeAccounts = accounts.filter((item) => !item.archived)
  const [amount, setAmount] = useState(transaction ? toInputAmount(transaction.amount_minor) : '')
  const [account, setAccount] = useState(transaction?.from_account_id || '')
  const [destination, setDestination] = useState(transaction?.to_account_id || assets[0]?.id || '')
  const [category, setCategory] = useState(transaction?.category_id || '')
  const [date, setDate] = useState(transaction?.occurred_at?.slice(0, 10) || today())
  const existingClock = transaction?.occurred_at ? new Date(transaction.occurred_at).toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : ''
  const [time, setTime] = useState(existingClock === '12:00' ? '' : existingClock)
  const [note, setNote] = useState(transaction?.note || transaction?.merchant_name || '')
  const [showDetails, setShowDetails] = useState(editing)
  const [showTransfer, setShowTransfer] = useState(initialFlow === 'transfer')
  const existingReceipt = useApp().receipts?.find((item) => item.transaction_id === transaction?.id)
  const [receipt, setReceipt] = useState(existingReceipt?.data_url || '')
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [accountDialog, setAccountDialog] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const dialogRef = useRef(null)
  const close = () => { if (!savingRef.current) onClose() }
  useModalBehavior(dialogRef, close)
  const visibleCategories = categories.filter((item) => item.type === type)
  // Las compras con dinero propio se encuentran primero; el crédito sigue disponible para compras con tarjeta.
  const sourceOptions = flow === 'expense' ? [...assets, ...activeAccounts.filter((item) => item.kind === 'liability')] : assets
  const destinationOptions = flow === 'debt'
    ? activeAccounts.filter((item) => item.kind === 'liability')
    : flow === 'income' ? assets : assets.filter((item) => item.id !== account)

  // Mantiene origen y destino válidos al pasar de una compra con crédito a un abono.
  const changeFlow = (nextFlow) => {
    setFlow(nextFlow)
    setCategory('')
    setError('')
    if (nextFlow === 'income') {
      setDestination(assets.some((item) => item.id === destination) ? destination : assets[0]?.id || '')
    } else if (nextFlow === 'debt' || nextFlow === 'transfer') {
      const source = assets.some((item) => item.id === account) ? account : assets[0]?.id || ''
      const previousDebt = flow === 'expense' && activeAccounts.find((item) => item.id === account && item.kind === 'liability')
      const targets = nextFlow === 'debt' ? activeAccounts.filter((item) => item.kind === 'liability') : assets.filter((item) => item.id !== source)
      setAccount(source)
      setDestination((nextFlow === 'debt' ? previousDebt?.id : null) || (targets.some((item) => item.id === destination) ? destination : targets[0]?.id || ''))
    } else if (!activeAccounts.some((item) => item.id === account)) {
      setAccount('')
    }
  }

  // Un cambio de origen nunca deja la misma cuenta seleccionada como destino.
  const changeSource = (id) => {
    setAccount(id)
    if (flow === 'transfer' && destination === id) setDestination(assets.find((item) => item.id !== id)?.id || '')
  }

  // La cuenta se selecciona únicamente después de que el formulario confirme su guardado.
  const accountCreated = (created) => {
    if (accountDialog === 'destination') setDestination(created.id)
    else changeSource(created.id)
    setError('')
  }

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
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError('')
    try {
      // Valida las selecciones reales, incluida la demo, antes de modificar saldos.
      if ((flow === 'debt' || flow === 'transfer' || (flow === 'expense' && account)) && !sourceOptions.some((item) => item.id === account)) throw new Error('Elige de dónde salió el dinero.')
      if (flow !== 'expense' && !destinationOptions.some((item) => item.id === destination)) throw new Error('Elige una cuenta de destino disponible.')
      movementSchema.parse({ amount, account, destination, category, date })
      const minor = parseLocalizedAmount(amount)
      if (flow === 'transfer' && account === destination) throw new Error('Elige cuentas diferentes para mover el dinero.')
      if ((type === 'expense' || type === 'income') && !category) throw new Error('Elige una categoría.')
      const storedType = flow === 'debt' ? 'card_payment' : type
      const record = {
        id: transaction?.id || makeId('transaction'),
        type: storedType,
        amount_minor: minor,
        currency: 'COP',
        occurred_at: `${date}T${time || '12:00'}:00-05:00`,
        from_account_id: flow === 'income' || (flow === 'expense' && !account) ? null : account,
        to_account_id: flow === 'expense' ? null : destination,
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
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <motion.div className="sheet-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <motion.section ref={dialogRef} inert={Boolean(accountDialog || categoryDialog)} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="movement-title" className="sheet" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
        <header><div><p className="eyebrow">{editing ? 'Editar' : 'Registrar'}</p><h2 id="movement-title">{editing ? 'Detalle del movimiento' : 'Nuevo movimiento'}</h2></div><button className="icon-button" aria-label="Cerrar" disabled={saving} onClick={close}><X /></button></header>
        <form onSubmit={submit}>
          <fieldset className="movement-choices"><legend>¿Qué pasó?</legend><div className={`movement-choices__grid${showTransfer ? ' movement-choices__grid--expanded' : ''}`}>{MOVEMENT_CHOICES.filter((item) => item.id !== 'transfer' || showTransfer).map((item) => <button type="button" key={item.id} disabled={saving} aria-pressed={flow === item.id} className={flow === item.id ? 'active' : ''} onClick={() => changeFlow(item.id)}>{item.label}</button>)}</div>{!showTransfer && <button type="button" className="movement-choices__more" onClick={() => setShowTransfer(true)}>Más opciones: moví dinero</button>}</fieldset>
          <Field label="Monto" error={error}><div className="amount-input"><span>$</span><input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(formatInputAmount(event.target.value))} placeholder="0" aria-describedby={error ? 'movement-error' : undefined} /><small>COP</small></div></Field>
          {flow !== 'income' && <>
            <Field label={flow === 'expense' ? '¿Con qué pagaste?' : '¿De dónde salió el dinero?'}><select aria-label={flow === 'expense' ? '¿Con qué pagaste?' : '¿De dónde salió el dinero?'} disabled={(flow !== 'expense' && !sourceOptions.length) || saving} value={sourceOptions.some((item) => item.id === account) ? account : ''} onChange={(event) => changeSource(event.target.value)}>{flow === 'expense' ? <option value="">Dinero disponible</option> : !sourceOptions.some((item) => item.id === account) && <option value="">{sourceOptions.length ? 'Selecciona una cuenta' : 'No hay cuentas disponibles'}</option>}{sourceOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{flow === 'expense' && item.kind === 'liability' ? ' (crédito)' : ''}</option>)}</select></Field>
            {flow === 'expense' && !account && <p className="helper">Cuenta en tu presupuesto; no cambia el saldo de ninguna cuenta.</p>}
            {flow !== 'expense' && !assets.length && <p className="helper" role="status">Agrega una cuenta con dinero para indicar de dónde salió.</p>}
            <button className="button button--quiet" type="button" disabled={saving} onClick={() => setAccountDialog('source')}><Plus aria-hidden="true" /> Agregar cuenta</button>
          </>}
          {flow !== 'expense' && <>
            <Field label={flow === 'income' ? '¿Dónde lo recibiste?' : flow === 'debt' ? '¿Qué deuda pagaste?' : '¿A qué cuenta lo moviste?'}><select aria-label={flow === 'income' ? '¿Dónde lo recibiste?' : flow === 'debt' ? '¿Qué deuda pagaste?' : '¿A qué cuenta lo moviste?'} disabled={!destinationOptions.length || saving} value={destinationOptions.some((item) => item.id === destination) ? destination : ''} onChange={(event) => setDestination(event.target.value)}>{!destinationOptions.some((item) => item.id === destination) && <option value="">{destinationOptions.length ? 'Selecciona una cuenta' : 'No hay cuentas disponibles'}</option>}{destinationOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            {flow === 'income' && <button className="button button--quiet" type="button" disabled={saving} onClick={() => setAccountDialog('destination')}><Plus aria-hidden="true" /> Agregar cuenta para recibir</button>}
            {flow === 'debt' && !destinationOptions.length && <p className="helper" role="status">Agrega primero tu deuda desde Cuentas.</p>}
          </>}
          {type !== 'transfer' && <div className="field"><span>Categoría</span><div className="input-with-action"><select aria-label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecciona una categoría</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="icon-button" aria-label="Crear categoría" onClick={() => setCategoryDialog(true)}><Plus /></button></div></div>}
          <button className="movement-details-toggle" type="button" aria-expanded={showDetails} aria-controls="movement-details" onClick={() => setShowDetails((value) => !value)}>{showDetails ? 'Ocultar detalles' : 'Añadir detalles'} <span aria-hidden="true">{showDetails ? '−' : '+'}</span></button>
          {showDetails && <div id="movement-details" className="movement-details"><div className="form-grid"><Field label="Fecha"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Hora" optional><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></Field></div><Field label="Comercio o nota" optional><input value={note} onChange={(event) => setNote(event.target.value)} maxLength="120" placeholder="Opcional" /></Field><Field label="Foto del comprobante" optional><label className="receipt-picker"><ImagePlus /><span>{receipt ? 'Cambiar imagen' : 'Añadir screenshot o foto'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => readReceipt(event.target.files?.[0], setReceipt, setError)} /></label>{receipt && <div className="receipt-preview"><img src={receipt} alt="Vista previa del comprobante" /><button type="button" className="button button--quiet" onClick={() => setReceipt('')}>Quitar</button><small>Se conserva de forma privada en este dispositivo.</small></div>}</Field></div>}
          {flow === 'debt' && <p className="info-note">Baja tu deuda y el saldo de la cuenta elegida. No suma otro gasto.</p>}
          <div className="sheet__actions">{editing && <button type="button" className="button button--danger" disabled={saving} onClick={deleteTransaction}><Trash2 /> Eliminar</button>}<button className="button button--primary" type="submit" disabled={saving || (flow !== 'expense' && !sourceOptions.length && flow !== 'income') || (flow !== 'expense' && !destinationOptions.length)}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar movimiento'}</button></div>
        </form>
      </motion.section>
      {categoryDialog && <CategoryDialog type={type} close={() => setCategoryDialog(false)} onCreated={setCategory} />}
      {accountDialog && <AccountDialog assetOnly close={() => setAccountDialog(null)} onCreated={accountCreated} />}
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

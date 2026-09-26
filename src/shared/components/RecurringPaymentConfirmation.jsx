import { SimpleDialog } from './Modal.jsx'

// Confirma el pago antes de ocultar su vencimiento en las listas compartidas.
export function RecurringPaymentConfirmation({ payment, saving, error, onCancel, onConfirm }) {
  const close = () => { if (!saving) onCancel() }

  return <SimpleDialog title="Confirmar pago" close={close}>
    <div className="recurring-payment-confirmation">
      <p>¿Confirmas que ya pagaste <strong>{payment.name}</strong>?</p>
      <p className="helper">Vencimiento: {formatDueDate(payment.dueDate)}. Al confirmar, quedará marcado como pagado y desaparecerá de la checklist. Esto no registra un movimiento ni cambia el saldo.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="sheet__actions">
        <button className="button button--secondary" type="button" disabled={saving} onClick={onCancel}>Todavía no</button>
        <button className="button button--primary" type="button" disabled={saving} onClick={onConfirm}>{saving ? 'Guardando…' : 'Confirmar pago'}</button>
      </div>
    </div>
  </SimpleDialog>
}

// Formatea la fecha como calendario local sin desplazarla por zona horaria.
function formatDueDate(isoDate) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${isoDate}T12:00:00-05:00`))
}

// Opciones de cuenta visibles en el formulario; el valor se guarda en `subtype`.
export const ACCOUNT_TYPE_OPTIONS = {
  asset: [
    { value: 'bank', label: 'Cuenta bancaria o billetera' },
    { value: 'cash', label: 'Efectivo' },
  ],
  liability: [
    { value: 'credit_card', label: 'Tarjeta de crédito' },
    { value: 'investment_loan', label: 'Préstamo de libre inversión' },
    { value: 'private_loan', label: 'Préstamo con persona o entidad' },
  ],
}

// Mantiene un subtipo válido cuando el usuario cambia entre activo y deuda.
export function defaultAccountSubtype(kind) {
  return ACCOUNT_TYPE_OPTIONS[kind][0].value
}

// Traduce el subtipo persistido a una descripción breve para cada fila.
export function accountTypeLabel(account) {
  return ACCOUNT_TYPE_OPTIONS[account.kind]?.find((option) => option.value === account.subtype)?.label || 'Tipo de cuenta'
}

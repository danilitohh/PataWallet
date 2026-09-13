import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Landmark,
  MoreHorizontal,
  Undo2,
} from 'lucide-react'

export const iconForType = {
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  transfer: ArrowLeftRight,
  card_payment: CreditCard,
  opening: Landmark,
  refund: Undo2,
  adjustment: MoreHorizontal,
}

export const labelForType = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  // Se conserva el valor técnico `card_payment` para compatibilidad, pero también cubre pagos de otros pasivos.
  card_payment: 'Pago de deuda',
  opening: 'Saldo inicial',
  refund: 'Reembolso',
  adjustment: 'Ajuste',
}

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
  card_payment: 'Pago de tarjeta',
  opening: 'Saldo inicial',
  refund: 'Reembolso',
  adjustment: 'Ajuste',
}

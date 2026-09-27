// Lee solo el libro de las cuentas compartidas del propietario, incluyendo todas sus páginas.
export async function sharedBalances(admin, ownerId, accountIds) {
  const totals = new Map()
  const allowed = new Set(accountIds)
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.from('ledger_entries')
      .select('account_id,delta_minor,transaction:transactions!inner(type,status)')
      .eq('user_id', ownerId).in('account_id', accountIds)
      .order('id', { ascending: true }).range(offset, offset + pageSize - 1)
    if (error) throw error
    for (const entry of data) {
      if (!allowed.has(entry.account_id) || entry.transaction.status === 'void') continue
      const delta = Number(entry.delta_minor)
      if (!Number.isSafeInteger(delta)) throw new Error('Asiento fuera de rango.')
      const total = totals.get(entry.account_id) || { balance_minor: 0, paid_minor: 0 }
      total.balance_minor += delta
      // Un ajuste o una devolución reduce deuda, pero no es un abono pagado.
      if (entry.transaction.type === 'card_payment' && delta < 0) total.paid_minor -= delta
      if (!Number.isSafeInteger(total.balance_minor) || !Number.isSafeInteger(total.paid_minor)) throw new Error('Total fuera de rango.')
      totals.set(entry.account_id, total)
    }
    if (data.length < pageSize) return totals
  }
}

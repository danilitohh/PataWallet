import { expect, it, vi } from 'vitest'
import { sharedBalances } from '../../server/couples/sharedBalances.js'

// Simula el contrato de consulta sin credenciales ni escrituras remotas.
function database(pages) {
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), range: vi.fn() }
  for (const method of ['select', 'eq', 'in', 'order']) query[method].mockReturnValue(query)
  query.range.mockImplementation(async (from) => ({ data: pages[from / 1000] || [], error: null }))
  return { query, admin: { from: vi.fn(() => query) } }
}

it('suma solo abonos reales y aísla propietario/cuentas en cada página', async () => {
  const entry = (type, delta, status = 'recorded', account = 'debt') => ({ account_id: account, delta_minor: String(delta), transaction: { type, status } })
  const { admin, query } = database([
    Array.from({ length: 1000 }, () => entry('opening', 100)),
    [entry('card_payment', -25000), entry('refund', -10000), entry('adjustment', -5000), entry('expense', 5000), entry('card_payment', -5000, 'void'), entry('card_payment', -9000, 'recorded', 'private')],
  ])
  expect((await sharedBalances(admin, 'owner-a', ['debt'])).get('debt')).toEqual({ balance_minor: 65000, paid_minor: 25000 })
  expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'owner-a')
  expect(query.eq).toHaveBeenNthCalledWith(2, 'user_id', 'owner-a')
  expect(query.in).toHaveBeenNthCalledWith(2, 'account_id', ['debt'])
  expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999)
})

it('no transforma errores ni importes inválidos en un avance de cero', async () => {
  const { admin, query } = database([])
  query.range.mockResolvedValueOnce({ data: null, error: new Error('Sin conexión') })
  await expect(sharedBalances(admin, 'owner', ['debt'])).rejects.toThrow('Sin conexión')
  query.range.mockResolvedValueOnce({ data: [{ account_id: 'debt', delta_minor: 'invalid', transaction: { type: 'opening' } }], error: null })
  await expect(sharedBalances(admin, 'owner', ['debt'])).rejects.toThrow('rango')
})

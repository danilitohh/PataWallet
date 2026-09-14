import { describe, expect, it, vi } from 'vitest'

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

vi.mock('../lib/supabase/client.js', () => ({ supabase: supabaseMock }))

const { executeRemoteOperation } = await import('./remoteRepository.js')

function query(result) {
  const chain = {
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  }
  return chain
}

describe('repositorio remoto', () => {
  it('reconcilia un ajuste opcional vacío creado antes del bootstrap', async () => {
    const userId = '11111111-1111-4111-8111-111111111111'
    const insert = query({ data: null, error: { code: '23505', message: 'duplicate key' } })
    const existing = query({ data: { key: 'nextPayDate', value: '2026-10-05', version: 1 }, error: null })
    const updated = query({ data: { key: 'nextPayDate', value: null, version: 2 }, error: null })
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
    supabaseMock.from.mockReset().mockReturnValueOnce(insert).mockReturnValueOnce(existing).mockReturnValueOnce(updated)

    const result = await executeRemoteOperation(userId, {
      entity: 'user_settings',
      action: 'create',
      entity_id: 'nextPayDate',
      payload: { key: 'nextPayDate', value: null, version: 1 },
      expected_version: null,
    })

    expect(result.row).toMatchObject({ key: 'nextPayDate', value: null, version: 2 })
    expect(updated.update).toHaveBeenCalledWith(expect.objectContaining({ value: null, version: 2 }))
  })
})

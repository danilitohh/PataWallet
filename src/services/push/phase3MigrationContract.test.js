import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../../../supabase/migrations/20260910210000_phase3_web_push.sql', import.meta.url), 'utf8')

describe('migración Web Push', () => {
  it('activa RLS, permisos mínimos y límite distribuido', () => {
    for (const table of ['push_subscriptions', 'push_outbox', 'push_deliveries', 'push_test_limits']) expect(sql).toContain(`alter table public.${table} enable row level security`)
    expect(sql).toContain('revoke all on public.push_subscriptions')
    expect(sql).toContain('grant select on public.push_subscriptions to authenticated')
    expect(sql).toContain('reserve_push_test_slot')
    expect(sql).toContain('to service_role')
  })

  it('usa outbox idempotente, reclamo bloqueado y alertas financieras correctas', () => {
    expect(sql).toContain('unique (user_id, event_key)')
    expect(sql).toContain('for update skip locked')
    expect(sql).toContain("status in ('pending', 'failed', 'processing')")
    expect(sql).toContain("type = 'expense' then amount_minor")
    expect(sql).toContain("type = 'refund' then -amount_minor")
    expect(sql).toContain("new.type not in ('expense', 'refund')")
  })
})

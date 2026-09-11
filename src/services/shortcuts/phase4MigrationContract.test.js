import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(new URL('../../../supabase/migrations/20260911013904_phase4_shortcuts_categorization.sql', import.meta.url), 'utf8')

describe('contrato de migración de Fase 4', () => {
  it.each(['device_links','card_mappings','category_rules','incoming_events'])('activa RLS y lectura propia en %s', (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`)
    expect(sql).toMatch(new RegExp(`${table}[\\s\\S]+auth\\.uid\\(\\).*user_id`))
  })
  it('mantiene tickets y límites fuera del esquema expuesto', () => {
    expect(sql).toContain('create table private.pairing_tickets')
    expect(sql).toContain('create table private.shortcut_rate_limits')
    expect(sql).toContain('revoke all on private.pairing_tickets')
  })
  it('consume tickets y deduplica eventos bajo bloqueo transaccional', () => {
    expect(sql).toContain('consumed_at is null and expires_at > now()')
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('unique (user_id, event_id)')
    expect(sql).toContain("return jsonb_build_object('status', 'conflict'")
  })
  it('revoca funciones privilegiadas y solo concede al servidor', () => {
    expect(sql).toMatch(/revoke all on function public\.server_ingest_shortcut_event[\s\S]+from public, anon, authenticated/)
    expect(sql).toMatch(/grant execute on function public\.server_ingest_shortcut_event[\s\S]+to service_role/)
  })
  it('registra el gasto y sus asientos antes de encolar revisión', () => {
    expect(sql).toContain("'expense'")
    expect(sql).toContain("'shortcut'")
    expect(sql).toContain('private.rebuild_transaction_ledger')
    expect(sql).toContain("'review:' || p_event_id::text")
  })
})

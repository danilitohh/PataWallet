import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const initial = fs.readFileSync(new URL('../../../supabase/migrations/20260910190000_auth_and_user_data.sql', import.meta.url), 'utf8')
const phase2 = fs.readFileSync(new URL('../../../supabase/migrations/20260910190327_phase2_ledger_sync_security.sql', import.meta.url), 'utf8')
const debtAndIncome = fs.readFileSync(new URL('../../../supabase/migrations/20260913042149_debt_schedule_and_income_settings.sql', import.meta.url), 'utf8')

describe('contrato de seguridad PostgreSQL', () => {
  it('activa RLS y limita cada tabla expuesta al propietario autenticado', () => {
    const tables = ['profiles', 'accounts', 'categories', 'transactions', 'budgets', 'goals', 'goal_allocations', 'user_settings']
    for (const table of tables) {
      expect(initial).toContain(`alter table public.${table} enable row level security`)
    }
    expect(initial.match(/\(select auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(7)
    expect(initial).toContain('revoke all on public.profiles')
  })

  it('impide referencias entre propietarios mediante claves compuestas', () => {
    expect(initial).toContain('foreign key (user_id, from_account_id) references public.accounts(user_id, id)')
    expect(initial).toContain('foreign key (user_id, category_id) references public.categories(user_id, id)')
    expect(initial).toContain('foreign key (user_id, goal_id) references public.goals(user_id, id)')
  })

  it('reserva escrituras financieras al RPC atómico e idempotente', () => {
    expect(phase2).toContain('create table if not exists public.ledger_entries')
    expect(phase2).toContain('for update;')
    expect(phase2).toContain('private.transaction_mutation_receipts')
    expect(phase2).toContain("p_action not in ('save', 'void', 'restore')")
    expect(phase2).toContain('revoke insert, update, delete on public.transactions from authenticated')
    expect(phase2).toContain('Los movimientos de demostración no se sincronizan con cuentas reales.')
    expect(phase2).toContain('grant execute on function public.mutate_transaction')
  })

  it('conserva el plan opcional de deuda y las referencias de ingresos', () => {
    expect(debtAndIncome).toContain('debt_installments_total integer')
    expect(debtAndIncome).toContain('debt_installments_paid integer not null default 0')
    expect(debtAndIncome).toContain("debt_payment_frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly')")
    expect(debtAndIncome).toContain("'monthlySalaryMinor', 'payFrequency'")
    expect(debtAndIncome).toContain('No genera movimientos automáticos')
  })
})

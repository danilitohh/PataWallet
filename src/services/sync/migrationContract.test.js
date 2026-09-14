import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const initial = fs.readFileSync(new URL('../../../supabase/migrations/20260910190000_auth_and_user_data.sql', import.meta.url), 'utf8')
const phase2 = fs.readFileSync(new URL('../../../supabase/migrations/20260910190327_phase2_ledger_sync_security.sql', import.meta.url), 'utf8')
const debtAndIncome = fs.readFileSync(new URL('../../../supabase/migrations/20260913042149_debt_schedule_and_income_settings.sql', import.meta.url), 'utf8')
const onboarding = fs.readFileSync(new URL('../../../supabase/migrations/20260913100000_financial_onboarding.sql', import.meta.url), 'utf8')
const debtMonthlyPayment = fs.readFileSync(new URL('../../../supabase/migrations/20260913103000_debt_monthly_payment.sql', import.meta.url), 'utf8')
const optionalNullSettings = fs.readFileSync(new URL('../../../supabase/migrations/20260913170000_allow_optional_null_user_settings.sql', import.meta.url), 'utf8')
const incomeSources = fs.readFileSync(new URL('../../../supabase/migrations/20260913190000_income_sources.sql', import.meta.url), 'utf8')

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

  it('permite persistir el punto de partida financiero con restricciones', () => {
    expect(onboarding).toContain("'financialOnboardingComplete', 'fixedExpenses', 'nextPayDate'")
    expect(onboarding).toContain('jsonb_array_length(value) <= 50')
    expect(onboarding).toContain('value #>>')
  })

  it('conserva el pago mensual de una deuda sin inventar cuotas', () => {
    expect(debtMonthlyPayment).toContain('debt_monthly_payment_minor bigint')
    expect(debtMonthlyPayment).toContain('kind = \'liability\'')
  })

  it('permite NULL solo en ajustes financieros opcionales', () => {
    expect(optionalNullSettings).toContain('alter column value drop not null')
    expect(optionalNullSettings).toContain("key in ('monthlySalaryMinor', 'payFrequency', 'nextPayDate')")
  })

  it('reconcilia pendientes antiguos de ajustes opcionales vacíos', () => {
    const repository = fs.readFileSync(new URL('../../../src/data/remoteRepository.js', import.meta.url), 'utf8')
    expect(repository).toContain('reconcileEmptyUserSetting')
    expect(repository).toContain("table === 'user_settings' && desired.value === null")
  })

  it('conserva fuentes de ingreso asociadas a cuentas sin crear movimientos', () => {
    expect(incomeSources).toContain("'incomeSources'")
    expect(incomeSources).toContain('jsonb_array_length(value) <= 50')
    expect(incomeSources).toContain('value is not null')
  })
})

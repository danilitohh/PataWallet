-- Conserva el pago mensual declarado durante el onboarding sin inventar un número de cuotas.
alter table public.accounts
  add column if not exists debt_monthly_payment_minor bigint;

alter table public.accounts
  drop constraint if exists accounts_debt_monthly_payment_check;

alter table public.accounts
  add constraint accounts_debt_monthly_payment_check
  check (
    (kind = 'asset' and debt_monthly_payment_minor is null)
    or (kind = 'liability' and (debt_monthly_payment_minor is null or debt_monthly_payment_minor between 1 and 999999999999))
  );


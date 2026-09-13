-- Permite registrar deudas de libre inversión y préstamos con personas o entidades.
-- Se conservan los subtipos existentes para no alterar cuentas ya creadas.
alter table public.accounts
  drop constraint if exists accounts_subtype_check,
  drop constraint if exists accounts_kind_subtype_consistent;

alter table public.accounts
  add constraint accounts_subtype_check
  check (subtype in ('bank', 'cash', 'credit_card', 'investment_loan', 'private_loan')),
  add constraint accounts_kind_subtype_consistent
  check (
    (kind = 'asset' and subtype in ('bank', 'cash'))
    or (kind = 'liability' and subtype in ('credit_card', 'investment_loan', 'private_loan'))
  );

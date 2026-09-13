-- Seguimiento opcional de cuotas y configuración de ingresos de cada usuario.
-- No genera movimientos automáticos: solo conserva el plan que la persona declara.

alter table public.accounts
  add column if not exists debt_installments_total integer,
  add column if not exists debt_installments_paid integer not null default 0,
  add column if not exists debt_installment_amount_minor bigint,
  add column if not exists debt_payment_frequency text;

alter table public.accounts
  drop constraint if exists accounts_debt_schedule_check;

alter table public.accounts
  add constraint accounts_debt_schedule_check
  check (
    (
      kind = 'asset'
      and debt_installments_total is null
      and debt_installments_paid = 0
      and debt_installment_amount_minor is null
      and debt_payment_frequency is null
    )
    or (
      kind = 'liability'
      and (
        (
          debt_installments_total is null
          and debt_installments_paid = 0
          and debt_installment_amount_minor is null
          and debt_payment_frequency is null
        )
        or (
          debt_installments_total between 1 and 600
          and debt_installments_paid between 0 and debt_installments_total
          and debt_installment_amount_minor between 1 and 999999999999
          and debt_payment_frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly')
        )
      )
    )
  );

-- Los ajustes de ingresos viven en user_settings para conservar el aislamiento RLS existente.
alter table public.user_settings
  drop constraint if exists user_settings_key_check,
  drop constraint if exists user_settings_value_shape;

alter table public.user_settings
  add constraint user_settings_key_check
  check (key in ('entered', 'theme', 'hiddenAmounts', 'motion', 'monthlySalaryMinor', 'payFrequency')),
  add constraint user_settings_value_shape
  check (
    (key in ('entered', 'hiddenAmounts') and jsonb_typeof(value) = 'boolean')
    or (key = 'theme' and value in ('"system"'::jsonb, '"light"'::jsonb, '"dark"'::jsonb))
    or (key = 'motion' and value in ('"system"'::jsonb, '"soft"'::jsonb, '"off"'::jsonb))
    or (
      key = 'monthlySalaryMinor'
      and case
        when value = 'null'::jsonb then true
        when jsonb_typeof(value) <> 'number' then false
        when (value #>> '{}') !~ '^[0-9]+$' then false
        else (value #>> '{}')::numeric between 1 and 999999999999
      end
    )
    or (
      key = 'payFrequency'
      and (value = 'null'::jsonb or value in ('"weekly"'::jsonb, '"biweekly"'::jsonb, '"semimonthly"'::jsonb, '"monthly"'::jsonb))
    )
  );

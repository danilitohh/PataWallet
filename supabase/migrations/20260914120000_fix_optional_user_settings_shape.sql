-- Alinea la forma de los ajustes opcionales con la columna nullable.
-- PostgREST convierte value: null en NULL SQL, no en el literal JSONB null.
-- Sin esta excepción, el primer arranque falla al crear nextPayDate vacío.

alter table public.user_settings
  drop constraint if exists user_settings_value_shape;

alter table public.user_settings
  add constraint user_settings_value_shape
  check (
    (key in ('entered', 'hiddenAmounts', 'financialOnboardingComplete') and jsonb_typeof(value) = 'boolean')
    or (key = 'theme' and value in ('"system"'::jsonb, '"light"'::jsonb, '"dark"'::jsonb))
    or (key = 'motion' and value in ('"system"'::jsonb, '"soft"'::jsonb, '"off"'::jsonb))
    or (
      key = 'monthlySalaryMinor'
      and (
        value is null
        or case
          when value = 'null'::jsonb then true
          when jsonb_typeof(value) <> 'number' then false
          when (value #>> '{}') !~ '^[0-9]+$' then false
          else (value #>> '{}')::numeric between 1 and 999999999999
        end
      )
    )
    or (
      key = 'payFrequency'
      and (
        value is null
        or value = 'null'::jsonb
        or value in ('"weekly"'::jsonb, '"biweekly"'::jsonb, '"semimonthly"'::jsonb, '"monthly"'::jsonb)
      )
    )
    or (
      key = 'fixedExpenses'
      and case when jsonb_typeof(value) = 'array' then jsonb_array_length(value) <= 50 else false end
    )
    or (
      key = 'nextPayDate'
      and (
        value is null
        or case
          when value = 'null'::jsonb then true
          when jsonb_typeof(value) = 'string' then (value #>> '{}') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          else false
        end
      )
    )
    or (
      key = 'incomeSources'
      and jsonb_typeof(value) = 'array'
      and jsonb_array_length(value) <= 50
    )
  );

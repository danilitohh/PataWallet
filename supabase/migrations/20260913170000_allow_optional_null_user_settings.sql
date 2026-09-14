-- Permite representar ajustes opcionales sin convertirlos en fallos de primer inicio.
-- Solo salario, frecuencia y fecha de pago pueden quedar sin valor; las preferencias
-- y banderas de estado siguen exigiendo un valor JSON válido.
alter table public.user_settings
  alter column value drop not null;

alter table public.user_settings
  drop constraint if exists user_settings_value_required_for_non_optional;

alter table public.user_settings
  add constraint user_settings_value_required_for_non_optional
  check (
    value is not null
    or key in ('monthlySalaryMinor', 'payFrequency', 'nextPayDate')
  );

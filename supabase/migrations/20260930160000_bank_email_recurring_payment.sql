-- Registra el importe real del correo y marca su ocurrencia recurrente dentro de la misma transacción.
create or replace function public.resolve_bank_email_recurring_payment(
  p_id uuid,
  p_payload jsonb,
  p_fixed_expense_id text,
  p_due_date text,
  p_distinct boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  setting_value jsonb;
  expense_value jsonb;
  payment_history jsonb;
  existing_payment jsonb;
  updated_expenses jsonb;
  result_value jsonb;
  event_date date;
  due_date_value date;
  anchor_date date;
  frequency_value text;
  payday_frequency text;
  anchor_day integer;
  first_day integer;
  month_days integer;
  interval_days integer;
  amount_value bigint;
  transaction_value text;
  due_date_text text;
begin
  if caller is null then
    raise exception using errcode = 'PT401', message = 'Sesión requerida.';
  end if;
  if p_id is null or p_fixed_expense_id is null or char_length(p_fixed_expense_id) not between 1 and 180
    or p_due_date is null
    or p_due_date !~ '^\d{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or p_payload->>'type' <> 'expense'
    or coalesce(p_payload->>'amount_minor', '') !~ '^[1-9][0-9]{0,11}$'
    or nullif(p_payload->>'category_id', '') is null
    or nullif(p_payload->>'occurred_at', '') is null then
    raise exception using errcode = '22023', message = 'Elige un gasto recurrente y confirma un gasto válido.';
  end if;

  due_date_value := p_due_date::date;
  due_date_text := to_char(due_date_value, 'YYYY-MM-DD');
  if due_date_text <> p_due_date then
    raise exception using errcode = '22023', message = 'La fecha del vencimiento no es válida.';
  end if;
  amount_value := (p_payload->>'amount_minor')::bigint;
  event_date := ((p_payload->>'occurred_at')::timestamptz at time zone 'America/Bogota')::date;
  if due_date_value < event_date - 45 or due_date_value > event_date + 45 then
    raise exception using errcode = '22023', message = 'El vencimiento seleccionado no corresponde a la fecha del movimiento.';
  end if;

  -- Bloquea el plan para que dos correos no paguen la misma ocurrencia simultáneamente.
  select value into setting_value
  from public.user_settings
  where user_id = caller and key = 'fixedExpenses'
  for update;
  if not found or jsonb_typeof(setting_value) <> 'array' then
    raise exception using errcode = 'PT404', message = 'No se encontró tu lista de gastos fijos.';
  end if;

  select item into expense_value
  from jsonb_array_elements(setting_value) as expenses(item)
  where item->>'id' = p_fixed_expense_id
  limit 1;
  if expense_value is null then
    raise exception using errcode = 'PT404', message = 'Ese gasto fijo ya no existe. Actualiza la lista.';
  end if;

  payment_history := coalesce(expense_value->'payment_history', '[]'::jsonb);
  if jsonb_typeof(payment_history) <> 'array' then
    raise exception using errcode = '22023', message = 'El historial de pagos necesita revisión.';
  end if;
  select payment into existing_payment
  from jsonb_array_elements(payment_history) as payments(payment)
  where payment->>'due_date' = due_date_text
  limit 1;
  transaction_value := 'bank-email-' || p_id::text;
  if existing_payment is not null and nullif(existing_payment->>'transaction_id', '') is not null
    and existing_payment->>'transaction_id' <> transaction_value then
    raise exception using errcode = 'PT409', message = 'Ese vencimiento ya está asociado a otro movimiento.';
  end if;

  frequency_value := coalesce(expense_value->>'frequency', 'monthly');
  anchor_date := nullif(expense_value->>'next_due_date', '')::date;
  if frequency_value = 'payday' then
    select value #>> '{}' into payday_frequency
    from public.user_settings where user_id = caller and key = 'payFrequency';
    if anchor_date is null then
      select nullif(value #>> '{}', '')::date into anchor_date
      from public.user_settings where user_id = caller and key = 'nextPayDate';
    end if;
    frequency_value := payday_frequency;
  end if;
  anchor_date := coalesce(anchor_date, (now() at time zone 'America/Bogota')::date);
  if due_date_value < anchor_date then
    raise exception using errcode = 'PT409', message = 'La fecha no pertenece a un vencimiento pendiente.';
  end if;

  -- Acepta solo fechas que pertenecen al calendario de repetición guardado.
  if frequency_value = 'monthly' then
    anchor_day := extract(day from anchor_date)::integer;
    month_days := extract(day from (date_trunc('month', due_date_value::timestamp) + interval '1 month' - interval '1 day'))::integer;
    if extract(day from due_date_value)::integer <> least(anchor_day, month_days) then
      raise exception using errcode = 'PT409', message = 'La fecha elegida no coincide con el calendario mensual.';
    end if;
  elsif frequency_value in ('weekly', 'biweekly') then
    interval_days := case when frequency_value = 'weekly' then 7 when expense_value->>'frequency' = 'biweekly' then 15 else 14 end;
    if mod(due_date_value - anchor_date, interval_days) <> 0 then
      raise exception using errcode = 'PT409', message = 'La fecha elegida no coincide con el calendario del gasto.';
    end if;
  elsif frequency_value = 'semimonthly' then
    anchor_day := extract(day from anchor_date)::integer;
    first_day := case when anchor_day > 15 then anchor_day - 15 else anchor_day end;
    month_days := extract(day from (date_trunc('month', due_date_value::timestamp) + interval '1 month' - interval '1 day'))::integer;
    if extract(day from due_date_value)::integer not in (least(first_day, month_days), least(first_day + 15, month_days)) then
      raise exception using errcode = 'PT409', message = 'La fecha elegida no coincide con tu calendario de pago.';
    end if;
  else
    raise exception using errcode = '22023', message = 'Configura la frecuencia de este gasto antes de vincularlo.';
  end if;

  -- El RPC existente valida cuentas, categoría, duplicados y asiento; cualquier error revierte todo.
  result_value := public.resolve_bank_email(p_id, 'record', p_payload, null, p_distinct);
  if result_value->>'transaction_id' <> transaction_value then
    raise exception using errcode = 'PT409', message = 'No se pudo vincular el movimiento con el aviso.';
  end if;

  if existing_payment is null or nullif(existing_payment->>'transaction_id', '') is null then
    select coalesce(jsonb_agg(
      case when item->>'id' = p_fixed_expense_id then
        jsonb_set(
          jsonb_set(item, '{payment_history}',
            (select coalesce(jsonb_agg(payment), '[]'::jsonb)
             from jsonb_array_elements(payment_history) as history(payment)
             where payment->>'due_date' <> due_date_text)
            || jsonb_build_array(jsonb_build_object(
              'due_date', due_date_text,
              'status', 'paid',
              'paid_at', now(),
              'paid_amount_minor', amount_value,
              'transaction_id', transaction_value
            )), true),
          '{category_id}', to_jsonb(p_payload->>'category_id'), true)
      else item end order by ordinal
    ), '[]'::jsonb) into updated_expenses
    from jsonb_array_elements(setting_value) with ordinality as source(item, ordinal);

    update public.user_settings
    set value = updated_expenses, version = version + 1, updated_at = now()
    where user_id = caller and key = 'fixedExpenses';
  end if;

  return result_value || jsonb_build_object('fixed_expense_id', p_fixed_expense_id, 'due_date', due_date_text);
end;
$$;

revoke all on function public.resolve_bank_email_recurring_payment(uuid, jsonb, text, text, boolean) from public, anon;
grant execute on function public.resolve_bank_email_recurring_payment(uuid, jsonb, text, text, boolean) to authenticated;

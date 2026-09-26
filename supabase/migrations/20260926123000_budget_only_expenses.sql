-- Permite registrar gastos del presupuesto sin inventar una cuenta bancaria ni un asiento.
alter table public.transactions
  add constraint transactions_budget_expense_accounts_check
  check (type = 'expense' or from_account_id is not null or to_account_id is not null) not valid;

do $$
declare
  old_constraint text;
begin
  select conname into strict old_constraint
  from pg_catalog.pg_constraint
  where conrelid = 'public.transactions'::regclass
    and contype = 'c'
    and conname <> 'transactions_budget_expense_accounts_check'
    and pg_catalog.pg_get_expr(conbin, conrelid) like '%from_account_id IS NOT NULL%to_account_id IS NOT NULL%';
  execute format('alter table public.transactions drop constraint %I', old_constraint);
end;
$$;

alter table public.transactions validate constraint transactions_budget_expense_accounts_check;

-- Reconstruye únicamente los asientos que afectan una cuenta real.
create or replace function private.rebuild_transaction_ledger(p_user_id uuid, p_transaction_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tx public.transactions%rowtype;
  from_kind text;
  to_kind text;
begin
  delete from public.ledger_entries
  where user_id = p_user_id and transaction_id = p_transaction_id;

  select * into tx
  from public.transactions
  where user_id = p_user_id and id = p_transaction_id;

  if not found or tx.status = 'void' then
    return;
  end if;

  if tx.from_account_id is not null then
    select kind into from_kind from public.accounts
    where user_id = p_user_id and id = tx.from_account_id;
  end if;
  if tx.to_account_id is not null then
    select kind into to_kind from public.accounts
    where user_id = p_user_id and id = tx.to_account_id;
  end if;

  if tx.type in ('opening', 'income') then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (p_user_id, tx.id, tx.to_account_id, 0, tx.amount_minor);
  elsif tx.type = 'expense' and tx.from_account_id is not null then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (p_user_id, tx.id, tx.from_account_id, 0, case when from_kind = 'liability' then tx.amount_minor else -tx.amount_minor end);
  elsif tx.type = 'transfer' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values
      (p_user_id, tx.id, tx.from_account_id, 0, -tx.amount_minor),
      (p_user_id, tx.id, tx.to_account_id, 1, tx.amount_minor);
  elsif tx.type = 'card_payment' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values
      (p_user_id, tx.id, tx.from_account_id, 0, -tx.amount_minor),
      (p_user_id, tx.id, tx.to_account_id, 1, -tx.amount_minor);
  elsif tx.type = 'refund' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (
      p_user_id,
      tx.id,
      coalesce(tx.to_account_id, tx.from_account_id),
      0,
      case when coalesce(to_kind, from_kind) = 'liability' then -tx.amount_minor else tx.amount_minor end
    );
  elsif tx.type = 'adjustment' then
    insert into public.ledger_entries (user_id, transaction_id, account_id, entry_index, delta_minor)
    values (
      p_user_id,
      tx.id,
      coalesce(tx.to_account_id, tx.from_account_id),
      0,
      case when tx.direction = 'decrease' then -tx.amount_minor else tx.amount_minor end
    );
  end if;
end;
$$;

-- Conserva el control de propiedad, categorías, versiones e idempotencia al aceptar el origen opcional.
create or replace function private.apply_transaction_mutation(
  p_operation_id uuid,
  p_action text,
  p_payload jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_digest text := md5(p_action || ':' || coalesce(p_payload::text, 'null') || ':' || coalesce(p_expected_version::text, 'null'));
  prior private.transaction_mutation_receipts%rowtype;
  current_tx public.transactions%rowtype;
  saved_tx public.transactions%rowtype;
  tx_id text := p_payload->>'id';
  tx_type text := p_payload->>'type';
  amount_value bigint;
  from_id text := nullif(p_payload->>'from_account_id', '');
  to_id text := nullif(p_payload->>'to_account_id', '');
  category_value text := nullif(p_payload->>'category_id', '');
  from_kind text;
  to_kind text;
  category_type text;
  result_value jsonb;
begin
  if caller_id is null then
    raise exception using errcode = 'PT401', message = 'Sesión vencida o ausente.';
  end if;
  if p_operation_id is null or p_action is null or p_action not in ('save', 'void', 'restore') or tx_id is null or tx_id = '' or char_length(tx_id) > 180 then
    raise exception using errcode = '22023', message = 'Operación de movimiento inválida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text || ':' || p_operation_id::text, 0));

  select * into prior
  from private.transaction_mutation_receipts
  where user_id = caller_id and operation_id = p_operation_id;
  if found then
    if prior.request_hash <> request_digest then
      raise exception using errcode = 'PT409', message = 'El identificador de reintento ya fue usado con datos diferentes.';
    end if;
    return prior.result;
  end if;

  if p_action in ('void', 'restore') then
    select * into current_tx from public.transactions
    where user_id = caller_id and id = tx_id
    for update;
    if not found then
      raise exception using errcode = 'PT404', message = 'Movimiento no encontrado.';
    end if;
    if p_expected_version is null or current_tx.version <> p_expected_version then
      raise exception using errcode = 'PT409', message = 'El movimiento cambió en otro dispositivo.';
    end if;
    update public.transactions
    set status = case when p_action = 'void' then 'void' else 'recorded' end,
        version = version + 1,
        updated_at = now()
    where user_id = caller_id and id = tx_id
    returning * into saved_tx;
  elsif p_action = 'save' then
    if tx_type not in ('opening', 'income', 'expense', 'transfer', 'card_payment', 'adjustment', 'refund') then
      raise exception using errcode = '22023', message = 'Tipo de movimiento inválido.';
    end if;
    amount_value := (p_payload->>'amount_minor')::bigint;
    if amount_value <= 0 or amount_value > 999999999999 then
      raise exception using errcode = '22003', message = 'Monto fuera del rango permitido.';
    end if;
    if coalesce(p_payload->>'currency', 'COP') <> 'COP' then
      raise exception using errcode = '22023', message = 'La moneda no coincide con el perfil.';
    end if;
    if coalesce(nullif(p_payload->>'source', ''), 'manual') = 'demo' then
      raise exception using errcode = '22023', message = 'Los movimientos de demostración no se sincronizan con cuentas reales.';
    end if;

    if from_id is not null then
      select kind into from_kind from public.accounts where user_id = caller_id and id = from_id;
      if not found then raise exception using errcode = '23503', message = 'La cuenta de origen no pertenece al usuario.'; end if;
    end if;
    if to_id is not null then
      select kind into to_kind from public.accounts where user_id = caller_id and id = to_id;
      if not found then raise exception using errcode = '23503', message = 'La cuenta de destino no pertenece al usuario.'; end if;
    end if;
    if category_value is not null then
      select type into category_type from public.categories where user_id = caller_id and id = category_value;
      if not found then raise exception using errcode = '23503', message = 'La categoría no pertenece al usuario.'; end if;
    end if;

    if tx_type = 'opening' and (from_id is not null or to_id is null) then raise exception using errcode = '23514', message = 'La apertura requiere una cuenta destino.'; end if;
    if tx_type = 'income' and (from_id is not null or to_kind is distinct from 'asset' or category_value is null or category_type is distinct from 'income') then raise exception using errcode = '23514', message = 'El ingreso requiere activo y categoría de ingreso.'; end if;
    if tx_type = 'expense' and (to_id is not null or category_value is null or category_type is distinct from 'expense') then raise exception using errcode = '23514', message = 'El gasto requiere una categoría de gasto y no utiliza cuenta destino.'; end if;
    if tx_type = 'transfer' and (from_kind is distinct from 'asset' or to_kind is distinct from 'asset' or from_id = to_id) then raise exception using errcode = '23514', message = 'La transferencia requiere dos activos propios diferentes.'; end if;
    if tx_type = 'card_payment' and (from_kind is distinct from 'asset' or to_kind is distinct from 'liability' or from_id = to_id) then raise exception using errcode = '23514', message = 'El pago requiere un activo y una tarjeta propios.'; end if;
    if tx_type in ('opening', 'transfer', 'card_payment', 'adjustment') and category_value is not null then raise exception using errcode = '23514', message = 'Este movimiento no utiliza categoría.'; end if;
    if tx_type = 'refund' and ((from_id is null) = (to_id is null) or category_value is null or category_type is distinct from 'expense') then raise exception using errcode = '23514', message = 'El reembolso requiere una cuenta propia y categoría de gasto.'; end if;
    if tx_type = 'adjustment' and ((from_id is null) = (to_id is null) or nullif(p_payload->>'direction', '') is null) then raise exception using errcode = '23514', message = 'El ajuste requiere una cuenta y dirección explícita.'; end if;

    select * into current_tx from public.transactions
    where user_id = caller_id and id = tx_id
    for update;

    if found then
      if p_expected_version is null or current_tx.version <> p_expected_version then
        raise exception using errcode = 'PT409', message = 'El movimiento cambió en otro dispositivo.';
      end if;
      update public.transactions set
        type = tx_type,
        amount_minor = amount_value,
        currency = 'COP',
        occurred_at = (p_payload->>'occurred_at')::timestamptz,
        from_account_id = from_id,
        to_account_id = to_id,
        category_id = category_value,
        merchant_name = nullif(p_payload->>'merchant_name', ''),
        note = coalesce(p_payload->>'note', ''),
        source = coalesce(nullif(p_payload->>'source', ''), current_tx.source),
        status = 'recorded',
        direction = nullif(p_payload->>'direction', ''),
        version = current_tx.version + 1,
        updated_at = now()
      where user_id = caller_id and id = tx_id
      returning * into saved_tx;
    else
      if p_expected_version is not null then
        raise exception using errcode = 'PT409', message = 'El movimiento esperado ya no existe.';
      end if;
      insert into public.transactions (
        id, user_id, type, amount_minor, currency, occurred_at, from_account_id,
        to_account_id, category_id, merchant_name, note, source, status, direction, version
      ) values (
        tx_id, caller_id, tx_type, amount_value, 'COP', (p_payload->>'occurred_at')::timestamptz,
        from_id, to_id, category_value, nullif(p_payload->>'merchant_name', ''),
        coalesce(p_payload->>'note', ''), coalesce(nullif(p_payload->>'source', ''), 'manual'),
        'recorded', nullif(p_payload->>'direction', ''), 1
      ) returning * into saved_tx;
    end if;
  end if;

  perform private.rebuild_transaction_ledger(caller_id, tx_id);
  result_value := jsonb_build_object('transaction', to_jsonb(saved_tx), 'operation_id', p_operation_id);
  insert into private.transaction_mutation_receipts (user_id, operation_id, request_hash, transaction_id, result)
  values (caller_id, p_operation_id, request_digest, tx_id, result_value);
  return result_value;
end;
$$;

-- Restauración: una migración posterior vuelve a exigir cuenta origen y solo tras asociar cada gasto presupuestario a una cuenta real.

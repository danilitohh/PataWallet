-- Admite una moneda base por perfil; los importes históricos no se convierten ni reescriben.

alter table public.profiles drop constraint if exists profiles_currency_check;
alter table public.profiles add constraint profiles_currency_check check (currency in ('COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'));

alter table public.accounts drop constraint if exists accounts_currency_check;
alter table public.accounts add constraint accounts_currency_check check (currency in ('COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'));

alter table public.transactions drop constraint if exists transactions_currency_check;
alter table public.transactions add constraint transactions_currency_check check (currency in ('COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'));

alter table public.budgets drop constraint if exists budgets_currency_check;
alter table public.budgets add constraint budgets_currency_check check (currency in ('COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'));

alter table public.goals drop constraint if exists goals_currency_check;
alter table public.goals add constraint goals_currency_check check (currency in ('COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'));

alter table public.planned_purchases drop constraint if exists planned_purchases_currency_check;
alter table public.planned_purchases add constraint planned_purchases_currency_check check (currency in ('COP', 'GTQ', 'USD', 'EUR', 'MXN', 'GBP'));

-- Cada movimiento manual y cada registro por integración debe conservar la moneda base del perfil.
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
  profile_currency text;
  result_value jsonb;
begin
  if caller_id is null then
    raise exception using errcode = 'PT401', message = 'Sesión vencida o ausente.';
  end if;
  select currency into profile_currency from public.profiles where id = caller_id;
  profile_currency := coalesce(profile_currency, 'COP');
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
    if coalesce(p_payload->>'currency', profile_currency) <> profile_currency then
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
        currency = profile_currency,
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
        tx_id, caller_id, tx_type, amount_value, profile_currency, (p_payload->>'occurred_at')::timestamptz,
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

create or replace function public.server_ingest_shortcut_event(
  p_user_id uuid, p_device_id uuid, p_event_id uuid, p_request_hash text,
  p_occurred_at timestamptz, p_amount_minor bigint, p_currency text,
  p_merchant_name text, p_normalized_merchant text,
  p_card_alias text, p_normalized_card_alias text, p_review_reasons text[]
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior public.incoming_events%rowtype; mapping public.card_mappings%rowtype; rule public.category_rules%rowtype;
  similar_event public.incoming_events%rowtype; similar_tx public.transactions%rowtype; event_row public.incoming_events%rowtype; tx public.transactions%rowtype;
  category_value text; tx_id text; status_value text; reasons text[] := coalesce(p_review_reasons, '{}'); similar_found boolean := false;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':' || p_event_id::text, 0));
  select * into prior from public.incoming_events where user_id = p_user_id and event_id = p_event_id;
  if found then
    if prior.request_hash <> p_request_hash then
      return jsonb_build_object('status', 'conflict', 'event_id', prior.event_id, 'incoming_id', prior.id, 'transaction_id', prior.transaction_id);
    end if;
    return jsonb_build_object('status', prior.result_status, 'event_id', prior.event_id, 'incoming_id', prior.id, 'transaction_id', prior.transaction_id, 'idempotent', true);
  end if;
  select * into mapping from public.card_mappings
  where user_id = p_user_id and normalized_alias = p_normalized_card_alias and active order by updated_at desc limit 1;
  if not found then reasons := array_append(reasons, 'card_not_mapped'); end if;
  if p_amount_minor is null then reasons := array_append(reasons, 'amount_missing_or_ambiguous'); end if;
  if p_currency is distinct from (select currency from public.profiles where id = p_user_id) then reasons := array_append(reasons, 'currency_missing_or_unsupported'); end if;
  if p_occurred_at is null then reasons := array_append(reasons, 'date_missing_or_invalid'); end if;
  if p_normalized_merchant is null or p_normalized_merchant = '' then reasons := array_append(reasons, 'merchant_missing'); end if;
  select coalesce(array_agg(distinct reason order by reason), '{}'::text[]) into reasons from unnest(reasons) as reason;

  if cardinality(reasons) = 0 then
    select * into similar_event from public.incoming_events
    where user_id = p_user_id and event_id <> p_event_id and transaction_id is not null
      and amount_minor = p_amount_minor and normalized_merchant is not distinct from p_normalized_merchant
      and occurred_at between p_occurred_at - interval '2 minutes' and p_occurred_at + interval '2 minutes'
    order by received_at desc limit 1;
    similar_found := found;
    if not similar_found then
      select * into similar_tx from public.transactions
      where user_id = p_user_id and status = 'recorded' and type = 'expense'
        and amount_minor = p_amount_minor and lower(trim(coalesce(merchant_name, ''))) = coalesce(p_normalized_merchant, '')
        and occurred_at between p_occurred_at - interval '2 minutes' and p_occurred_at + interval '2 minutes'
      order by occurred_at desc limit 1;
      similar_found := found;
    end if;
  end if;
  if similar_found then
    status_value := 'duplicate';
    reasons := array_append(reasons, 'possible_duplicate');
  elsif cardinality(reasons) > 0 then
    status_value := 'needs_review';
  else
    select * into rule from public.category_rules
    where user_id = p_user_id and active and match_type = 'merchant_exact' and normalized_pattern = p_normalized_merchant
    order by priority, created_at limit 1;
    if found then category_value := rule.category_id; status_value := 'recorded';
    else
      category_value := p_user_id::text || ':expense-uncategorized';
      insert into public.categories(id, user_id, name, type)
      values(category_value, p_user_id, 'Sin categoría', 'expense') on conflict(id) do nothing;
      status_value := 'recorded_needs_category';
      reasons := array_append(reasons, 'category_missing');
    end if;
    tx_id := 'shortcut-' || p_event_id::text;
    insert into public.transactions(id, user_id, type, amount_minor, currency, occurred_at, from_account_id, category_id, merchant_name, note, source, status)
    values(tx_id, p_user_id, 'expense', p_amount_minor, p_currency, p_occurred_at, mapping.account_id, category_value, p_merchant_name, '', 'shortcut', 'recorded')
    returning * into tx;
    perform private.rebuild_transaction_ledger(p_user_id, tx_id);
  end if;
  insert into public.incoming_events(user_id, device_id, event_id, schema_version, request_hash, occurred_at, amount_minor, currency,
    merchant_name, normalized_merchant, card_alias, normalized_card_alias, source, mode, result_status, review_reasons,
    transaction_id, possible_duplicate_of, possible_duplicate_transaction_id)
  values(p_user_id, p_device_id, p_event_id, 1, p_request_hash, p_occurred_at, p_amount_minor, p_currency,
    p_merchant_name, p_normalized_merchant, p_card_alias, p_normalized_card_alias, 'ios_shortcuts', 'capture', status_value, reasons,
    tx_id, similar_event.id, similar_tx.id)
  returning * into event_row;
  update public.device_links set last_event_at = now() where id = p_device_id and user_id = p_user_id;
  if status_value in ('needs_review', 'duplicate', 'recorded_needs_category') then
    insert into public.push_outbox(user_id, event_key, event_kind, payload)
    values(p_user_id, 'review:' || p_event_id::text, 'review', jsonb_build_object('incoming_event_id', event_row.id))
    on conflict(user_id, event_key) do nothing;
  end if;
  return jsonb_build_object('status', status_value, 'event_id', p_event_id, 'incoming_id', event_row.id, 'transaction_id', tx_id, 'idempotent', false);
end; $$;

create or replace function public.server_resolve_shortcut_event(
  p_user_id uuid, p_incoming_id uuid, p_expected_version integer, p_action text,
  p_account_id text, p_category_id text, p_amount_minor bigint, p_occurred_at timestamptz,
  p_transaction_id text, p_create_rule boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare item public.incoming_events%rowtype; category_type text; account_kind text; linked public.transactions%rowtype; tx_id text;
begin
  select * into item from public.incoming_events where id = p_incoming_id and user_id = p_user_id for update;
  if not found then raise exception using errcode = 'PT404', message = 'Evento no encontrado.'; end if;
  if item.version <> p_expected_version or item.resolved_at is not null then raise exception using errcode = 'PT409', message = 'Este evento ya cambió o fue resuelto.'; end if;
  if p_action = 'associate' then
    select * into linked from public.transactions where user_id = p_user_id and id = p_transaction_id and status = 'recorded';
    if not found then raise exception using errcode = '23503', message = 'El movimiento no pertenece al usuario.'; end if;
    update public.incoming_events set transaction_id = linked.id, result_status = 'recorded', review_reasons = '{}', resolved_at = now(), version = version + 1
    where id = item.id returning * into item;
  elsif p_action = 'record' then
    select kind into account_kind from public.accounts where user_id = p_user_id and id = p_account_id and not archived;
    if not found then raise exception using errcode = '23503', message = 'La cuenta no pertenece al usuario o está archivada.'; end if;
    select type into category_type from public.categories where user_id = p_user_id and id = p_category_id;
    if not found or category_type <> 'expense' then raise exception using errcode = '23503', message = 'La categoría de gasto no pertenece al usuario.'; end if;
    if coalesce(p_amount_minor, item.amount_minor) is null or coalesce(p_occurred_at, item.occurred_at) is null or item.currency is distinct from (select currency from public.profiles where id = p_user_id) then
      raise exception using errcode = '22023', message = 'Completa monto, moneda del perfil y fecha antes de registrar.';
    end if;
    tx_id := 'shortcut-' || item.event_id::text;
    insert into public.transactions(id,user_id,type,amount_minor,currency,occurred_at,from_account_id,category_id,merchant_name,note,source,status)
    values(tx_id,p_user_id,'expense',coalesce(p_amount_minor,item.amount_minor),item.currency,coalesce(p_occurred_at,item.occurred_at),p_account_id,p_category_id,item.merchant_name,'','shortcut','recorded');
    perform private.rebuild_transaction_ledger(p_user_id, tx_id);
    update public.incoming_events set transaction_id = tx_id, amount_minor = coalesce(p_amount_minor, amount_minor), occurred_at = coalesce(p_occurred_at, occurred_at), currency = item.currency,
      result_status = 'recorded', review_reasons = '{}', resolved_at = now(), version = version + 1 where id = item.id returning * into item;
    if p_create_rule and item.normalized_merchant is not null then
      insert into public.category_rules(user_id, merchant_pattern, normalized_pattern, category_id)
      values(p_user_id, item.merchant_name, item.normalized_merchant, p_category_id)
      on conflict(user_id, match_type, normalized_pattern) do update set category_id = excluded.category_id, active = true,
        version = public.category_rules.version + 1, updated_at = now();
    end if;
  elsif p_action = 'categorize' then
    select type into category_type from public.categories where user_id = p_user_id and id = p_category_id;
    if not found or category_type <> 'expense' then raise exception using errcode = '23503', message = 'La categoría no pertenece al usuario.'; end if;
    perform pg_catalog.set_config('patawallet.skip_movement_push', 'true', true);
    update public.transactions set category_id = p_category_id, version = version + 1, updated_at = now()
    where user_id = p_user_id and id = item.transaction_id and source = 'shortcut';
    if not found then raise exception using errcode = 'PT404', message = 'Movimiento automático no encontrado.'; end if;
    update public.incoming_events set result_status='recorded', review_reasons='{}', resolved_at=now(), version=version+1 where id=item.id returning * into item;
    if p_create_rule and item.normalized_merchant is not null then
      insert into public.category_rules(user_id, merchant_pattern, normalized_pattern, category_id)
      values(p_user_id, item.merchant_name, item.normalized_merchant, p_category_id)
      on conflict(user_id, match_type, normalized_pattern) do update set category_id=excluded.category_id, active=true,
        version=public.category_rules.version+1, updated_at=now();
    end if;
  else raise exception using errcode = '22023', message = 'Acción de revisión inválida.';
  end if;
  return jsonb_build_object('status', item.result_status, 'incoming_id', item.id, 'transaction_id', item.transaction_id, 'version', item.version);
end; $$;

create or replace function public.resolve_bank_email(p_id uuid, p_action text, p_payload jsonb default '{}'::jsonb, p_transaction_id text default null, p_distinct boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := (select auth.uid()); item public.bank_email_events%rowtype; tx_id text;
  digest text := md5(coalesce(p_action,'') || coalesce(p_payload::text,'') || coalesce(p_transaction_id,'') || coalesce(p_distinct::text,''));
begin
  if caller is null then raise exception using errcode = 'PT401', message = 'Sesión requerida.'; end if;
  -- Dos correos del mismo movimiento se revisan en serie, también desde dispositivos distintos.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bank-email-review:' || caller::text,0));
  select * into item from public.bank_email_events where id = p_id and user_id = caller for update;
  if not found then raise exception using errcode = 'PT404', message = 'Correo no encontrado.'; end if;
  if item.status <> 'pending' then
    if item.resolution_hash = digest then return jsonb_build_object('status',item.status,'transaction_id',item.transaction_id); end if;
    raise exception using errcode = 'PT409', message = 'Este correo ya fue revisado.';
  end if;
  if p_action = 'link' then
    select id into tx_id from public.transactions where user_id = caller and id = p_transaction_id and status = 'recorded'
      and currency = (select currency from public.profiles where id = caller);
    if not found then raise exception using errcode = 'PT404', message = 'Movimiento no encontrado en la moneda base del perfil.'; end if;
  elsif p_action = 'record' then
    if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 4000
      or coalesce(p_payload->>'type','') not in ('expense','income','transfer','card_payment','refund')
      or coalesce(p_payload->>'currency','') <> (select currency from public.profiles where id = caller)
      or coalesce(p_payload->>'amount_minor','') !~ '^[1-9][0-9]{0,11}$'
      or nullif(p_payload->>'occurred_at','') is null
      or (nullif(p_payload->>'from_account_id','') is null and nullif(p_payload->>'to_account_id','') is null) then
      raise exception using errcode = '22023', message = 'Confirma tipo, cuenta, fecha y monto en la moneda base de tu perfil.';
    end if;
    if exists(select 1 from public.accounts where user_id = caller and archived and id in (p_payload->>'from_account_id',p_payload->>'to_account_id')) then
      raise exception using errcode = '22023', message = 'La cuenta está archivada.';
    end if;
    if not coalesce(p_distinct,false) and exists (
      select 1 from public.transactions where user_id = caller and status = 'recorded'
      and amount_minor = (p_payload->>'amount_minor')::bigint
      and occurred_at between (p_payload->>'occurred_at')::timestamptz - interval '2 minutes' and (p_payload->>'occurred_at')::timestamptz + interval '2 minutes'
    ) then
      raise exception using errcode = 'PT409', message = 'Hay un movimiento similar. Vincúlalo o confirma que es otro movimiento.';
    end if;
    tx_id := 'bank-email-' || item.id::text;
    perform private.apply_transaction_mutation(item.id,'save',p_payload || jsonb_build_object('id',tx_id,'source','import'),null);
  elsif p_action is distinct from 'dismiss' then
    raise exception using errcode = '22023', message = 'Decisión inválida.';
  end if;
  update public.bank_email_events set status = case p_action when 'link' then 'linked' when 'record' then 'recorded' else 'dismissed' end,
    transaction_id = tx_id, resolved_at = now(), resolution_hash = digest where id = item.id returning * into item;
  return jsonb_build_object('status',item.status,'transaction_id',tx_id);
end; $$;

create or replace function public.review_couple_change_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.couple_change_requests%rowtype;
  account_row public.accounts%rowtype;
  transaction_id text;
  amount_value bigint;
  direction_value text;
begin
  if p_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'Decisión inválida.';
  end if;

  select * into request_row
  from public.couple_change_requests
  where id = p_request_id
  for update;
  if not found or request_row.status <> 'pending' then
    raise exception using errcode = 'PT404', message = 'La solicitud ya fue revisada o no existe.';
  end if;
  if request_row.proposer_id = p_reviewer_id then
    raise exception using errcode = '42501', message = 'La persona que propone no puede aprobar su propio cambio.';
  end if;
  if not exists (
    select 1 from public.couple_members
    where couple_id = request_row.couple_id and user_id = p_reviewer_id and status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'No perteneces a este espacio compartido.';
  end if;

  select * into account_row
  from public.accounts
  where user_id = request_row.owner_user_id and id = request_row.account_id
  for update;
  if not found or not exists (
    select 1 from public.couple_shared_accounts
    where couple_id = request_row.couple_id and owner_user_id = request_row.owner_user_id and account_id = request_row.account_id and revoked_at is null
  ) then
    raise exception using errcode = '23503', message = 'La cuenta ya no está compartida.';
  end if;
  if request_row.payload ? 'currency' and request_row.payload->>'currency' is distinct from account_row.currency then
    raise exception using errcode = '22023', message = 'La moneda de la solicitud no coincide con la cuenta.';
  end if;

  if p_decision = 'approve' then
    if request_row.change_type = 'account_update' then
      if request_row.expected_version is null or account_row.version <> request_row.expected_version then
        update public.couple_change_requests set status = 'conflict', reviewer_id = p_reviewer_id, reviewed_at = now() where id = request_row.id;
        select * into request_row from public.couple_change_requests where id = request_row.id;
        return to_jsonb(request_row);
      end if;
      update public.accounts set
        name = coalesce(nullif(request_row.payload->>'name', ''), account_row.name),
        debt_monthly_payment_minor = case when request_row.payload ? 'debt_monthly_payment_minor' then (request_row.payload->>'debt_monthly_payment_minor')::bigint else account_row.debt_monthly_payment_minor end,
        version = account_row.version + 1,
        updated_at = now()
      where user_id = account_row.user_id and id = account_row.id;
    else
      amount_value := (request_row.payload->>'amount_minor')::bigint;
      direction_value := request_row.payload->>'direction';
      if amount_value is null or amount_value <= 0 or amount_value > 999999999999 or direction_value not in ('increase', 'decrease') then
        raise exception using errcode = '22023', message = 'El ajuste de la cuenta no es válido.';
      end if;
      transaction_id := 'couple-adjustment-' || gen_random_uuid()::text;
      insert into public.transactions (id, user_id, type, amount_minor, currency, occurred_at, from_account_id, to_account_id, category_id, merchant_name, note, source, status, direction, version)
      values (transaction_id, account_row.user_id, 'adjustment', amount_value, account_row.currency, now(), null, account_row.id, null, null, coalesce(nullif(request_row.payload->>'note', ''), 'Ajuste aprobado en Parejas'), 'manual', 'recorded', direction_value, 1);
      perform private.rebuild_transaction_ledger(account_row.user_id, transaction_id);
    end if;
  end if;

  update public.couple_change_requests set
    status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
    reviewer_id = p_reviewer_id,
    applied_transaction_id = transaction_id,
    reviewed_at = now()
  where id = request_row.id
  returning * into request_row;
  return to_jsonb(request_row);
end;
$$;

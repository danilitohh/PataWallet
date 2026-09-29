-- Recepción aislada: ninguna entrega de correo crea asientos. La revisión es explícita y atómica.
-- Desactivación reversible: retirar webhook y BANK_EMAIL_ENABLED; conservar registros y trazabilidad.
create table public.bank_email_addresses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  address text not null unique check (char_length(address) <= 254),
  enabled boolean not null default true,
  consent_at timestamptz not null default now(),
  last_received_at timestamptz,
  verification_code text check (verification_code ~ '^[0-9]{6,12}$'),
  verification_at timestamptz
);

create table public.bank_email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null unique,
  dedupe_key text not null check (char_length(dedupe_key) = 64),
  bank text not null check (bank in ('lulo','bancolombia','nequi')),
  candidate jsonb not null check (jsonb_typeof(candidate) = 'object' and octet_length(candidate::text) < 8000),
  received_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','recorded','linked','dismissed')),
  transaction_id text,
  resolved_at timestamptz,
  resolution_hash text,
  unique (user_id, dedupe_key),
  foreign key (user_id, transaction_id) references public.transactions(user_id,id)
);
create index bank_email_pending_idx on public.bank_email_events(user_id, status, received_at desc);
alter table public.bank_email_addresses enable row level security;
alter table public.bank_email_events enable row level security;
create policy bank_email_address_owner on public.bank_email_addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy bank_email_event_owner on public.bank_email_events for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.bank_email_addresses, public.bank_email_events from anon, authenticated;
grant select on public.bank_email_addresses, public.bank_email_events to authenticated;
grant all on public.bank_email_addresses, public.bank_email_events to service_role;

-- El usuario se resuelve desde el destinatario habilitado, nunca desde el cuerpo del correo.
create function public.server_receive_bank_email(p_address text, p_provider_id uuid, p_dedupe_key text, p_bank text, p_candidate jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare inbox public.bank_email_addresses%rowtype; event_id uuid;
begin
  select * into inbox from public.bank_email_addresses where address = p_address and enabled for update;
  if not found then return jsonb_build_object('status','ignored'); end if;
  -- Comparte el límite diario con los conectores OAuth (esta migración aún no fue publicada).
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bank-email-ingest:' || inbox.user_id::text,0));
  if exists(select 1 from public.bank_email_events where provider_id = p_provider_id or (user_id = inbox.user_id and dedupe_key = p_dedupe_key)) then
    return jsonb_build_object('status','duplicate');
  end if;
  -- Límite persistente por destinatario, serializado con la revocación y demás entregas.
  if (select count(*) from public.bank_email_events where user_id = inbox.user_id and received_at > now() - interval '1 day') >= 200 then
    raise exception using errcode = 'PT429', message = 'Límite diario de correos alcanzado.';
  end if;
  insert into public.bank_email_events(user_id,provider_id,dedupe_key,bank,candidate)
  values(inbox.user_id,p_provider_id,p_dedupe_key,p_bank,p_candidate)
  on conflict do nothing returning id into event_id;
  update public.bank_email_addresses set last_received_at = now() where user_id = inbox.user_id;
  return jsonb_build_object('status', case when event_id is null then 'duplicate' else 'pending' end);
end; $$;
revoke all on function public.server_receive_bank_email(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.server_receive_bank_email(text,uuid,text,text,jsonb) to service_role;

-- Reutiliza validación monetaria, propiedad, auditoría e idempotencia del registro ya existente.
create function public.resolve_bank_email(p_id uuid, p_action text, p_payload jsonb default '{}'::jsonb, p_transaction_id text default null, p_distinct boolean default false)
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
    select id into tx_id from public.transactions where user_id = caller and id = p_transaction_id and status = 'recorded';
    if not found then raise exception using errcode = 'PT404', message = 'Movimiento no encontrado.'; end if;
  elsif p_action = 'record' then
    if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 4000
      or coalesce(p_payload->>'type','') not in ('expense','income','transfer','card_payment','refund')
      or coalesce(p_payload->>'currency','') <> 'COP'
      or coalesce(p_payload->>'amount_minor','') !~ '^[1-9][0-9]{0,11}$'
      or nullif(p_payload->>'occurred_at','') is null
      or (nullif(p_payload->>'from_account_id','') is null and nullif(p_payload->>'to_account_id','') is null) then
      raise exception using errcode = '22023', message = 'Confirma tipo, cuenta, fecha y monto en COP.';
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
revoke all on function public.resolve_bank_email(uuid,text,jsonb,text,boolean) from public,anon;
grant execute on function public.resolve_bank_email(uuid,text,jsonb,text,boolean) to authenticated;

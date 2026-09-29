-- Extensión aditiva: OAuth separado del login; secretos cifrados solo accesibles al servidor.
-- Recuperación: desactivar flags del proveedor y conservar la bandeja/asientos; no DROP automático.
create table public.mail_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gmail','outlook')),
  generation uuid not null,
  status text not null default 'pending' check (status in ('pending','connected','reauthorize','disconnected')),
  mailbox text check (char_length(mailbox) <= 254),
  mailbox_id text check (char_length(mailbox_id) <= 300),
  banks text[] not null check (cardinality(banks) between 1 and 3 and banks <@ array['lulo','bancolombia','nequi']::text[]),
  token_cipher text check (char_length(token_cipher) <= 32000),
  state_hash text unique, cookie_hash text, verifier_cipher text, oauth_expires_at timestamptz,
  consent_at timestamptz not null default now(),
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_attempt_at timestamptz,
  sync_lease uuid, lease_until timestamptz,
  cursor jsonb check (octet_length(cursor::text) <= 10000),
  primary key (user_id,provider)
);
alter table public.mail_connections enable row level security;
revoke all on public.mail_connections from public,anon,authenticated;
grant all on public.mail_connections to service_role;
-- Ninguna política de cliente: la API expone solo estado/dirección, jamás SELECT * al navegador.
alter table public.bank_email_events add column ingestion_source text not null default 'forwarded'
  check (ingestion_source in ('forwarded','gmail','outlook'));

-- Un intento vivo por usuario/proveedor. No reemplazar una cuenta activa sin desconectarla primero.
create function public.server_begin_mail_oauth(p_user uuid,p_provider text,p_generation uuid,p_banks text[],p_state text,p_cookie text,p_verifier text)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.mail_connections(user_id,provider,generation,banks,state_hash,cookie_hash,verifier_cipher,oauth_expires_at)
    values(p_user,p_provider,p_generation,p_banks,p_state,p_cookie,p_verifier,now()+interval '10 minutes')
  on conflict(user_id,provider) do update set generation=p_generation,banks=p_banks,status='pending',
    state_hash=p_state,cookie_hash=p_cookie,verifier_cipher=p_verifier,oauth_expires_at=now()+interval '10 minutes',
    token_cipher=null,mailbox=null,mailbox_id=null,cursor=null,connected_at=null,last_sync_at=null,
    sync_lease=null,lease_until=null,consent_at=now()
  where mail_connections.status <> 'connected' and mail_connections.consent_at < now()-interval '10 seconds';
  if not found then raise exception using errcode='PT409',message='Espera o desconecta la cuenta actual antes de vincular otra.'; end if;
end; $$;

-- Consumo único con bloqueo de fila: proveedor, estado, cookie y vencimiento deben coincidir.
create function public.server_consume_mail_oauth(p_provider text,p_state text,p_cookie text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.mail_connections%rowtype;
begin
  select * into item from public.mail_connections where provider=p_provider and state_hash=p_state
    and cookie_hash=p_cookie and oauth_expires_at>now() and status='pending' for update;
  if not found then raise exception using errcode='PT400',message='Autorización vencida o inválida.'; end if;
  update public.mail_connections set state_hash=null,cookie_hash=null,verifier_cipher=null,oauth_expires_at=null
    where user_id=item.user_id and provider=item.provider;
  return jsonb_build_object('user_id',item.user_id,'provider',item.provider,'generation',item.generation,'verifier_cipher',item.verifier_cipher);
end; $$;

-- Lease persistente protege refresh_token rotativo frente a pestañas y peticiones concurrentes.
create function public.server_claim_mail_sync(p_user uuid,p_provider text,p_lease uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.mail_connections%rowtype;
begin
  update public.mail_connections set sync_lease=p_lease,lease_until=now()+interval '5 minutes',last_attempt_at=now()
    where user_id=p_user and provider=p_provider and status='connected' and token_cipher is not null
      and (lease_until is null or lease_until<now()) and (last_attempt_at is null or last_attempt_at<now()-interval '30 seconds')
    returning * into item;
  if not found then raise exception using errcode='PT409',message='Espera 30 segundos o vuelve a conectar el correo.'; end if;
  return to_jsonb(item);
end; $$;

-- Página atómica: nunca avanza el cursor si falla persistencia; revocar invalida trabajos en curso.
create function public.server_commit_mail_page(p_user uuid,p_provider text,p_generation uuid,p_lease uuid,p_events jsonb,p_cursor jsonb,p_until timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.mail_connections%rowtype; entry jsonb; added integer:=0; changed integer;
begin
  select * into item from public.mail_connections where user_id=p_user and provider=p_provider and generation=p_generation
    and status='connected' and sync_lease=p_lease and lease_until>now() for update;
  if not found then raise exception using errcode='PT409',message='La conexión cambió. No se guardó esta búsqueda.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bank-email-ingest:' || p_user::text,0));
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>20 then
    raise exception using errcode='22023',message='Página inválida.';
  end if;
  for entry in select value from jsonb_array_elements(p_events) loop
    if exists(select 1 from public.bank_email_events where user_id=p_user and dedupe_key=entry->>'dedupe_key') then continue; end if;
    if (select count(*) from public.bank_email_events where user_id=p_user and received_at>now()-interval '1 day') >= 200 then
      raise exception using errcode='PT429',message='Límite diario de correos alcanzado.';
    end if;
    insert into public.bank_email_events(user_id,provider_id,dedupe_key,bank,candidate,ingestion_source)
      values(p_user,(entry->>'provider_id')::uuid,entry->>'dedupe_key',entry->>'bank',entry->'candidate',p_provider)
      on conflict do nothing;
    get diagnostics changed = row_count;
    added := added+changed;
  end loop;
  update public.mail_connections set cursor=p_cursor,last_sync_at=case when p_cursor is null then p_until else last_sync_at end,
    sync_lease=null,lease_until=null where user_id=p_user and provider=p_provider;
  return jsonb_build_object('added',added,'has_more',p_cursor is not null);
end; $$;

revoke all on function public.server_begin_mail_oauth(uuid,text,uuid,text[],text,text,text) from public,anon,authenticated;
revoke all on function public.server_consume_mail_oauth(text,text,text) from public,anon,authenticated;
revoke all on function public.server_claim_mail_sync(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.server_commit_mail_page(uuid,text,uuid,uuid,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.server_begin_mail_oauth(uuid,text,uuid,text[],text,text,text) to service_role;
grant execute on function public.server_consume_mail_oauth(text,text,text) to service_role;
grant execute on function public.server_claim_mail_sync(uuid,text,uuid) to service_role;
grant execute on function public.server_commit_mail_page(uuid,text,uuid,uuid,jsonb,jsonb,timestamptz) to service_role;

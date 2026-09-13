-- Espacios financieros compartidos opcionales; nunca mezclan las filas personales por defecto.
create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couple_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.couple_invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couple_spaces(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null check (invitee_email = lower(btrim(invitee_email))),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_shared_accounts (
  couple_id uuid not null references public.couple_spaces(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  shared_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (couple_id, owner_user_id, account_id),
  foreign key (owner_user_id, account_id) references public.accounts(user_id, id) on delete cascade
);

create table if not exists public.couple_change_requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couple_spaces(id) on delete cascade,
  proposer_id uuid not null references auth.users(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  change_type text not null check (change_type in ('account_update', 'account_adjustment')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  expected_version integer,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'conflict')),
  reviewer_id uuid references auth.users(id) on delete set null,
  applied_transaction_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  foreign key (owner_user_id, account_id) references public.accounts(user_id, id)
);

create index if not exists couple_members_user_idx on public.couple_members (user_id, status);
create index if not exists couple_invitations_email_idx on public.couple_invitations (invitee_email, status);
create index if not exists couple_shared_accounts_owner_idx on public.couple_shared_accounts (owner_user_id, account_id);
create index if not exists couple_change_requests_couple_idx on public.couple_change_requests (couple_id, status, created_at desc);

-- La API de servidor es la única puerta de estas tablas; aun así quedan protegidas por RLS.
alter table public.couple_spaces enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invitations enable row level security;
alter table public.couple_shared_accounts enable row level security;
alter table public.couple_change_requests enable row level security;
revoke all on public.couple_spaces, public.couple_members, public.couple_invitations, public.couple_shared_accounts, public.couple_change_requests from anon, authenticated;
grant all on public.couple_spaces, public.couple_members, public.couple_invitations, public.couple_shared_accounts, public.couple_change_requests to service_role;

-- Aprueba o rechaza cambios y, si procede, aplica el ajuste al libro del propietario en una sola transacción.
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
      values (transaction_id, account_row.user_id, 'adjustment', amount_value, 'COP', now(), null, account_row.id, null, null, coalesce(nullif(request_row.payload->>'note', ''), 'Ajuste aprobado en Parejas'), 'manual', 'recorded', direction_value, 1);
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

revoke all on function public.review_couple_change_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.review_couple_change_request(uuid, uuid, text) to service_role;

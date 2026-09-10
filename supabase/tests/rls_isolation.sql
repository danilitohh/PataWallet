-- Run with `supabase test db` against an isolated local Supabase instance.
-- This script intentionally rolls back every fixture.
begin;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.invalid', '', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.invalid', '', now(), now(), now());

insert into public.accounts (id, user_id, name, kind, subtype)
values ('account-a', '11111111-1111-4111-8111-111111111111', 'A', 'asset', 'bank'),
       ('account-b', '22222222-2222-4222-8222-222222222222', 'B', 'asset', 'bank');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select results_eq('select id from public.accounts order by id', array['account-a'], 'A solo puede leer su cuenta');
select is_empty($$ update public.accounts set name = 'intrusión' where id = 'account-b' returning id $$, 'A no puede modificar B');
select throws_ok($$ insert into public.transactions (id,user_id,type,amount_minor,currency,occurred_at,from_account_id,note,source,status) values ('cross','11111111-1111-4111-8111-111111111111','expense',100,'COP',now(),'account-b','','manual','recorded') $$, '23503', null, 'A no puede referenciar la cuenta de B');
select is((select count(*) from public.accounts), 1::bigint, 'RLS filtra consultas directas sin filtro de propietario');

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select results_eq('select id from public.accounts order by id', array['account-b'], 'B solo puede leer su cuenta');
select is_empty($$ delete from public.accounts where id = 'account-a' returning id $$, 'B no puede eliminar A');
select is((select count(*) from public.transactions), 0::bigint, 'B no puede leer movimientos de A');

reset role;
set local role anon;
select is_empty('select id from public.accounts', 'Una solicitud anónima no puede leer cuentas');

select * from finish();
rollback;


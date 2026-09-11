-- Run with `supabase test db` against an isolated local Supabase instance.
-- This script intentionally rolls back every fixture.
begin;
select plan(20);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.invalid', '', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.invalid', '', now(), now(), now());

insert into public.accounts (id, user_id, name, kind, subtype)
values ('account-a', '11111111-1111-4111-8111-111111111111', 'A', 'asset', 'bank'),
       ('account-b', '22222222-2222-4222-8222-222222222222', 'B', 'asset', 'bank');

insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth_key)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'https://fcm.googleapis.com/fcm/send/user-a', repeat('a', 32), repeat('b', 16)),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'https://fcm.googleapis.com/fcm/send/user-b', repeat('c', 32), repeat('d', 16));

insert into public.categories(id,user_id,name,type) values
  ('category-a','11111111-1111-4111-8111-111111111111','Comida','expense'),
  ('category-b','22222222-2222-4222-8222-222222222222','Comida','expense');
insert into public.device_links(id,user_id,label,token_hash,token_expires_at,template_version) values
  ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','iPhone A',repeat('1',64),now()+interval '1 day','1.0.0'),
  ('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','iPhone B',repeat('2',64),now()+interval '1 day','1.0.0');
insert into public.card_mappings(id,user_id,card_alias,normalized_alias,account_id) values
  ('aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Visa A','visa a','account-a'),
  ('bbbbbbbb-3333-4333-8333-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Visa B','visa b','account-b');
insert into public.category_rules(id,user_id,merchant_pattern,normalized_pattern,category_id) values
  ('aaaaaaaa-4444-4444-8444-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Mercado A','mercado a','category-a'),
  ('bbbbbbbb-4444-4444-8444-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Mercado B','mercado b','category-b');
insert into public.incoming_events(id,user_id,device_id,event_id,schema_version,request_hash,source,mode,result_status) values
  ('aaaaaaaa-5555-4555-8555-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa','aaaaaaaa-6666-4666-8666-aaaaaaaaaaaa',1,repeat('a',64),'ios_shortcuts','capture','needs_review'),
  ('bbbbbbbb-5555-4555-8555-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb','bbbbbbbb-6666-4666-8666-bbbbbbbbbbbb',1,repeat('b',64),'ios_shortcuts','capture','needs_review');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select results_eq('select id from public.accounts order by id', array['account-a'], 'A solo puede leer su cuenta');
select is_empty($$ update public.accounts set name = 'intrusión' where id = 'account-b' returning id $$, 'A no puede modificar B');
select throws_ok($$ insert into public.transactions (id,user_id,type,amount_minor,currency,occurred_at,from_account_id,note,source,status) values ('cross','11111111-1111-4111-8111-111111111111','expense',100,'COP',now(),'account-b','','manual','recorded') $$, '23503', null, 'A no puede referenciar la cuenta de B');
select is((select count(*) from public.accounts), 1::bigint, 'RLS filtra consultas directas sin filtro de propietario');
select results_eq('select id from public.push_subscriptions order by id', array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid], 'A solo puede leer su suscripción');
select throws_ok($$ delete from public.push_subscriptions where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id $$, '42501', null, 'A no puede desactivar directamente la suscripción de B');
select throws_ok($$ insert into public.push_subscriptions (user_id,endpoint,p256dh,auth_key) values ('11111111-1111-4111-8111-111111111111','https://fcm.googleapis.com/fcm/send/direct',repeat('e',32),repeat('f',16)) $$, '42501', null, 'El navegador no puede escribir suscripciones directamente');
select results_eq($$ select label from public.device_links $$, array['iPhone A'], 'A solo ve su vinculación');
select results_eq($$ select card_alias from public.card_mappings $$, array['Visa A'], 'A solo ve su mapeo');
select results_eq($$ select merchant_pattern from public.category_rules $$, array['Mercado A'], 'A solo ve su regla');
select results_eq($$ select event_id from public.incoming_events $$, array['aaaaaaaa-6666-4666-8666-aaaaaaaaaaaa'::uuid], 'A solo ve su evento');
select throws_ok($$ insert into public.card_mappings(user_id,card_alias,normalized_alias,account_id) values ('11111111-1111-4111-8111-111111111111','Directa','directa','account-a') $$, '42501', null, 'El navegador no administra mapeos directamente');

set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select results_eq('select id from public.accounts order by id', array['account-b'], 'B solo puede leer su cuenta');
select is_empty($$ delete from public.accounts where id = 'account-a' returning id $$, 'B no puede eliminar A');
select is((select count(*) from public.transactions), 0::bigint, 'B no puede leer movimientos de A');
select results_eq('select id from public.push_subscriptions order by id', array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid], 'B solo puede leer su suscripción');
select results_eq($$ select label from public.device_links $$, array['iPhone B'], 'B solo ve su vinculación');
select results_eq($$ select event_id from public.incoming_events $$, array['bbbbbbbb-6666-4666-8666-bbbbbbbbbbbb'::uuid], 'B solo ve su evento');

reset role;
set local role anon;
select is_empty('select id from public.accounts', 'Una solicitud anónima no puede leer cuentas');
select throws_ok($$ select id from public.device_links $$, '42501', null, 'Una solicitud anónima no puede leer vinculaciones');

select * from finish();
rollback;

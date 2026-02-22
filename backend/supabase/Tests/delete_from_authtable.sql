begin;

select plan(3);

-- Clean slate
delete from public."UserRole" where user_id = '11111111-1111-1111-1111-111111111111';
delete from public."Contacts" where id = '11111111-1111-1111-1111-111111111111';
delete from public."User" where id = '11111111-1111-1111-1111-111111111111';
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

-- Insert into auth.users
insert into auth.users (id, email)
values (
  '11111111-1111-1111-1111-111111111111',
  'edge_test@example.com'
);

-- Insert into public.User
insert into public."User"(id, email, first_name, last_name, phone)
values (
  '11111111-1111-1111-1111-111111111111',
  'edge_test@example.com',
  'First',
  'Last',
  '1234567890'
);

-- Simulate Edge Function deletes
delete from public."UserRole"
where user_id = '11111111-1111-1111-1111-111111111111';

delete from public."User"
where id = '11111111-1111-1111-1111-111111111111';

delete from auth.users
where id = '11111111-1111-1111-1111-111111111111';

-- Tests
select ok(
  not exists(select 1 from public."User" where id = '11111111-1111-1111-1111-111111111111'),
  'User row deleted'
);

select ok(
  not exists(select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  'Auth user deleted'
);

select ok(
  not exists(select 1 from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'Contacts cleaned up'
);

select * from finish();

rollback;
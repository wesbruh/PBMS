begin;

select plan(8);

-- Clean slate
delete from public."Contacts" where id = '11111111-1111-1111-1111-111111111111';
delete from public."User" where id = '11111111-1111-1111-1111-111111111111';

-- Insert
insert into public."User"(id, email, first_name, last_name, phone)
values (
  '11111111-1111-1111-1111-111111111111',
  'pgtap_user_sync_test@example.com',
  'First',
  'Last',
  '1234567890'
);

select ok(
  exists(select 1 from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'INSERT into User creates Contacts row'
);

select is(
  (select email::text from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'pgtap_user_sync_test@example.com',
  'Contacts.email matches User.email'
);

select is(
  (select first_name::text from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'First',
  'Contacts.first_name matches User.first_name'
);

-- Update
update public."User"
set first_name = 'Updated',
    last_name = 'Name',
    phone = '9999999999'
where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select first_name::text from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'Updated',
  'UPDATE User propagates to Contacts.first_name'
);

select is(
  (select last_name::text from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'Name',
  'UPDATE User propagates to Contacts.last_name'
);

select is(
  (select phone::text from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  '9999999999',
  'UPDATE User propagates to Contacts.phone'
);

-- Delete
delete from public."User"
where id = '11111111-1111-1111-1111-111111111111';

select ok(
  not exists(select 1 from public."Contacts" where id = '11111111-1111-1111-1111-111111111111'),
  'DELETE User cascades delete to Contacts'
);

select ok(
  not exists(select 1 from public."User" where id = '11111111-1111-1111-1111-111111111111'),
  'User row deleted'
);

select * from finish();

rollback;
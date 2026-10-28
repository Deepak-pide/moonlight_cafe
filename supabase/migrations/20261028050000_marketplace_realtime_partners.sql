alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('customer', 'business', 'delivery_partner', 'admin'));

create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 60),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  created_at timestamptz not null default now()
);

insert into public.shop_categories (name)
values
  ('Cafe & dining'),
  ('Bakery'),
  ('Groceries'),
  ('Stationery'),
  ('Flowers & gifts'),
  ('Other local business')
on conflict (name) do nothing;

update public.businesses
set category = btrim(category)
where category is distinct from btrim(category);

insert into public.shop_categories (name)
select distinct btrim(category)
from public.businesses
where btrim(category) <> ''
on conflict (name) do nothing;

update public.businesses
set category = 'Other local business'
where btrim(category) = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_category_fk'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_category_fk
      foreign key (category) references public.shop_categories(name)
      on update cascade on delete restrict;
  end if;
end;
$$;

alter table public.shop_categories enable row level security;
grant select on public.shop_categories to anon, authenticated;
grant insert, update, delete on public.shop_categories to authenticated;

drop policy if exists "Shop categories are public" on public.shop_categories;
create policy "Shop categories are public"
  on public.shop_categories for select to anon, authenticated
  using (true);

drop policy if exists "Administrators manage shop categories" on public.shop_categories;
create policy "Administrators manage shop categories"
  on public.shop_categories for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create table if not exists public.delivery_partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_partner_applications enable row level security;
grant select, insert on public.delivery_partner_applications to authenticated;
grant update on public.delivery_partner_applications to authenticated;

drop policy if exists "Applicants view their delivery application" on public.delivery_partner_applications;
create policy "Applicants view their delivery application"
  on public.delivery_partner_applications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Customers apply to become delivery partners" on public.delivery_partner_applications;
create policy "Customers apply to become delivery partners"
  on public.delivery_partner_applications for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'customer'
    )
  );

drop policy if exists "Administrators review delivery applications" on public.delivery_partner_applications;
create policy "Administrators review delivery applications"
  on public.delivery_partner_applications for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.orders
  add column if not exists delivery_fee integer not null default 0
    check (delivery_fee >= 0),
  add column if not exists delivery_address text not null default '',
  add column if not exists delivery_partner_id uuid
    references public.profiles(id) on delete set null;

create index if not exists delivery_partner_applications_status_idx
  on public.delivery_partner_applications(status, created_at);
create index if not exists orders_delivery_queue_idx
  on public.orders(status, fulfillment, delivery_partner_id)
  where fulfillment = 'Delivery';

create or replace function public.sync_delivery_partner_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    update public.profiles
    set role = case when new.status = 'approved' then 'delivery_partner' else 'customer' end
    where id = new.user_id
      and role in ('customer', 'delivery_partner');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists delivery_partner_applications_sync_role
  on public.delivery_partner_applications;
create trigger delivery_partner_applications_sync_role
  before update of status on public.delivery_partner_applications
  for each row execute procedure public.sync_delivery_partner_role();

create or replace function public.apply_delivery_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.fulfillment = 'Delivery' then
    select coalesce(sc.delivery_fee, 0)
    into new.delivery_fee
    from public.businesses b
    left join public.shop_categories sc on sc.name = b.category
    where b.id = new.business_id;
    new.total := new.total + new.delivery_fee;
  else
    new.delivery_fee := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_apply_delivery_fee on public.orders;
create trigger orders_apply_delivery_fee
  before insert on public.orders
  for each row execute procedure public.apply_delivery_fee();

create or replace function public.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := public.current_app_role();
  v_is_owner boolean;
begin
  if public.is_admin() then
    new.updated_at := now();
    return new;
  end if;

  if new.id is distinct from old.id
    or new.customer_id is distinct from old.customer_id
    or new.business_id is distinct from old.business_id
    or new.customer_name is distinct from old.customer_name
    or new.phone is distinct from old.phone
    or new.branch is distinct from old.branch
    or new.fulfillment is distinct from old.fulfillment
    or new.note is distinct from old.note
    or new.delivery_address is distinct from old.delivery_address
    or new.total is distinct from old.total
    or new.delivery_fee is distinct from old.delivery_fee
    or new.created_at is distinct from old.created_at then
    raise exception 'Order details cannot be changed after checkout';
  end if;

  select exists (
    select 1 from public.businesses
    where id = old.business_id and owner_id = (select auth.uid())
  ) into v_is_owner;

  if v_role = 'delivery_partner'
    and old.fulfillment = 'Delivery'
    and old.status = 'Ready'
    and old.delivery_partner_id is null
    and new.delivery_partner_id = (select auth.uid())
    and new.status = old.status then
    new.updated_at := now();
    return new;
  end if;

  if v_role = 'delivery_partner'
    and old.fulfillment = 'Delivery'
    and old.delivery_partner_id = (select auth.uid())
    and new.delivery_partner_id = old.delivery_partner_id
    and (
      (old.status = 'Ready' and new.status = 'On the way')
      or (old.status = 'On the way' and new.status = 'Completed')
    ) then
    new.updated_at := now();
    return new;
  end if;

  if not v_is_owner then
    raise exception 'Only the shop owner or assigned delivery partner can update this order';
  end if;

  if new.delivery_partner_id is distinct from old.delivery_partner_id then
    raise exception 'Only a delivery partner can claim a delivery order';
  end if;

  if not (
    (old.status = 'New' and new.status in ('Accepted', 'Cancelled'))
    or (old.status = 'Accepted' and new.status = 'Preparing')
    or (old.status = 'Preparing' and new.status = 'Ready')
    or (old.status = 'Ready' and old.fulfillment = 'Pickup' and new.status = 'Completed')
  ) then
    raise exception 'Invalid order status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('New', 'Accepted', 'Preparing', 'Ready', 'On the way', 'Completed', 'Cancelled'));

drop policy if exists "Delivery partners view ready and assigned orders" on public.orders;
create policy "Delivery partners view ready and assigned orders"
  on public.orders for select to authenticated
  using (
    (select public.current_app_role()) = 'delivery_partner'
    and fulfillment = 'Delivery'
    and (
      (status = 'Ready' and delivery_partner_id is null)
      or delivery_partner_id = (select auth.uid())
    )
  );

drop policy if exists "Delivery partners update claimed delivery orders" on public.orders;
create policy "Delivery partners update claimed delivery orders"
  on public.orders for update to authenticated
  using (
    (select public.current_app_role()) = 'delivery_partner'
    and fulfillment = 'Delivery'
    and (
      (status = 'Ready' and delivery_partner_id is null)
      or delivery_partner_id = (select auth.uid())
    )
  )
  with check (
    (select public.current_app_role()) = 'delivery_partner'
    and fulfillment = 'Delivery'
    and delivery_partner_id = (select auth.uid())
  );

drop policy if exists "Delivery partners read their delivery items" on public.order_items;
create policy "Delivery partners read their delivery items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.fulfillment = 'Delivery'
        and (
          (o.status = 'Ready' and o.delivery_partner_id is null)
          or o.delivery_partner_id = (select auth.uid())
        )
    )
  );

create or replace function public.claim_delivery_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.current_app_role()) is distinct from 'delivery_partner' then
    raise exception 'Only approved delivery partners can accept delivery requests';
  end if;

  update public.orders
  set delivery_partner_id = (select auth.uid())
  where id = p_order_id
    and fulfillment = 'Delivery'
    and status = 'Ready'
    and delivery_partner_id is null;

  if not found then
    raise exception 'This delivery was already claimed or is no longer ready';
  end if;
end;
$$;

create or replace function public.set_delivery_order_status(
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select public.current_app_role()) is distinct from 'delivery_partner' then
    raise exception 'Only approved delivery partners can update delivery status';
  end if;
  if p_status not in ('On the way', 'Completed') then
    raise exception 'Invalid delivery status';
  end if;

  update public.orders
  set status = p_status
  where id = p_order_id
    and fulfillment = 'Delivery'
    and delivery_partner_id = (select auth.uid())
    and (
      (status = 'Ready' and p_status = 'On the way')
      or (status = 'On the way' and p_status = 'Completed')
    );

  if not found then
    raise exception 'This delivery is not assigned to you or cannot change to that status';
  end if;
end;
$$;

revoke all on function public.claim_delivery_order(uuid) from public;
grant execute on function public.claim_delivery_order(uuid) to authenticated;
revoke all on function public.set_delivery_order_status(uuid, text) from public;
grant execute on function public.set_delivery_order_status(uuid, text) to authenticated;

create or replace function public.delete_business_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    (select public.is_admin())
    or exists (
      select 1 from public.business_categories c
      join public.businesses b on b.id = c.business_id
      where c.id = p_category_id
        and b.owner_id = (select auth.uid())
        and b.status = 'approved'
    )
  ) then
    raise exception 'You cannot remove this category';
  end if;
  if exists (
    select 1 from public.business_categories c
    join public.products p
      on p.business_id = c.business_id and p.category = c.name
    where c.id = p_category_id
  ) then
    raise exception 'Move or remove products in this category before deleting it';
  end if;
  delete from public.business_categories where id = p_category_id;
end;
$$;

revoke all on function public.delete_business_category(uuid) from public;
grant execute on function public.delete_business_category(uuid) to authenticated;

drop function if exists public.place_order(uuid, text, text, text, text, text, jsonb);
create or replace function public.place_order(
  p_business_id uuid,
  p_customer_name text,
  p_phone text,
  p_branch text,
  p_fulfillment text,
  p_note text,
  p_items jsonb,
  p_delivery_address text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_total integer := 0;
  v_delivery_address text := left(btrim(coalesce(p_delivery_address, '')), 300);
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in before placing an order';
  end if;
  if p_customer_name is null
    or p_phone is null
    or char_length(trim(p_customer_name)) not between 1 and 100
    or char_length(trim(p_phone)) not between 5 and 30 then
    raise exception 'Enter a valid name and phone number';
  end if;
  if p_fulfillment is null or p_fulfillment not in ('Pickup', 'Delivery') then
    raise exception 'Choose a valid fulfilment method';
  end if;
  if p_fulfillment = 'Delivery' and char_length(v_delivery_address) not between 5 and 300 then
    raise exception 'Enter a valid delivery address';
  end if;
  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'An order must contain between 1 and 50 items';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.status = 'approved'
      and b.branches ? trim(p_branch)
  ) then
    raise exception 'This shop or branch is not available';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity not between 1 and 99 then
      raise exception 'Item quantity must be between 1 and 99';
    end if;
    select * into v_product
    from public.products p
    where p.id = (v_item ->> 'product_id')::uuid
      and p.business_id = p_business_id
    for update;
    if not found or v_product.stock < v_quantity then
      raise exception 'An item is unavailable or has insufficient stock';
    end if;
    v_total := v_total + v_product.price * v_quantity;
  end loop;

  insert into public.orders (
    id, customer_id, business_id, customer_name, phone, branch,
    fulfillment, note, total, delivery_address
  ) values (
    v_order_id, (select auth.uid()), p_business_id, trim(p_customer_name), trim(p_phone),
    trim(p_branch), p_fulfillment, left(coalesce(p_note, ''), 500), v_total, v_delivery_address
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product
    from public.products p
    where p.id = (v_item ->> 'product_id')::uuid
      and p.business_id = p_business_id;
    update public.products
    set stock = stock - v_quantity
    where id = v_product.id;
    insert into public.order_items (
      order_id, product_id, product_name, quantity, unit_price
    ) values (
      v_order_id, v_product.id, v_product.name, v_quantity, v_product.price
    );
  end loop;
  return v_order_id;
end;
$$;

revoke all on function public.place_order(uuid, text, text, text, text, text, jsonb, text) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text, jsonb, text) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'orders',
    'businesses',
    'products',
    'business_categories',
    'shop_categories',
    'delivery_partner_applications',
    'business_reviews',
    'follows',
    'profiles',
    'ads'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$$;

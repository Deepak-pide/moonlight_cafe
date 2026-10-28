create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  neighbourhood text not null default 'Indiranagar, Bengaluru',
  role text not null default 'customer' check (role in ('customer', 'business', 'admin')),
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  handle text not null unique,
  category text not null,
  description text not null default '',
  theme text not null default 'coffee' check (theme in ('coffee', 'green', 'maroon')),
  offer text not null default '',
  hours text not null default '',
  branches jsonb not null default '[]'::jsonb check (jsonb_typeof(branches) = 'array'),
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  reviews integer not null default 0 check (reviews >= 0),
  verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  details text not null default '',
  category text not null default 'Shop favourites',
  price integer not null check (price > 0),
  emoji text not null default '✨',
  stock integer not null default 0 check (stock >= 0),
  offer text not null default '',
  created_at timestamptz not null default now()
);

create table public.follows (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, business_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  customer_name text not null,
  phone text not null,
  branch text not null,
  fulfillment text not null check (fulfillment in ('Pickup', 'Delivery')),
  note text not null default '',
  total integer not null check (total > 0),
  status text not null default 'New' check (status in ('New', 'Accepted', 'Ready', 'Completed', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price > 0)
);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 70),
  message text not null check (char_length(message) between 1 and 150),
  status text not null default 'pending' check (status in ('pending', 'live', 'paused', 'rejected')),
  created_at timestamptz not null default now()
);

insert into public.businesses (
  id, name, handle, category, description, theme, offer, hours, branches,
  rating, reviews, verified, status
) values
  ('00000000-0000-4000-8000-000000000001', 'Moonlight Cafe', '@moonlight.cafe', 'Cafe & dining', 'Coffee, comfort food & slow mornings', 'coffee', 'Free cookie with any coffee', 'Open today · 8:00 am – 7:00 pm', '["12th Main Street", "HAL 2nd Stage"]', 4.9, 128, true, 'approved'),
  ('00000000-0000-4000-8000-000000000002', 'Sunday Bakehouse', '@sunday.bakes', 'Bakery', 'Small-batch breads & buttery bakes', 'coffee', 'Fresh sourdough at 4 pm', 'Open today · 7:00 am – 6:00 pm', '["Jeevan Bima Nagar", "Indiranagar"]', 4.9, 204, true, 'approved'),
  ('00000000-0000-4000-8000-000000000003', 'The Good Grocer', '@thegoodgrocer', 'Groceries', 'Fresh produce from nearby farms', 'green', 'Farm box from ₹299', 'Open today · 8:00 am – 8:00 pm', '["Indiranagar"]', 4.7, 92, true, 'approved'),
  ('00000000-0000-4000-8000-000000000004', 'Paper Trail Stationery', '@papertrail.indiranagar', 'Stationery', 'Notebooks, paper goods & thoughtful gifts', 'maroon', 'Buy 2, get 10% off', 'Open today · 10:00 am – 8:00 pm', '["100 Feet Road"]', 4.9, 67, true, 'approved'),
  ('00000000-0000-4000-8000-000000000005', 'Wildflower Studio', '@wildflower.studio', 'Flowers & gifts', 'Thoughtful bouquets, made by hand', 'maroon', '10% off this week', 'Open today · 9:00 am – 6:00 pm', '["CMH Road"]', 4.8, 86, true, 'approved')
on conflict (id) do nothing;

insert into public.products (
  id, business_id, name, details, category, price, emoji, stock
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Honey oat flat white', 'Double espresso · oat milk · local honey', 'Coffee & tea', 180, '☕', 18),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Almond croissant', 'Freshly baked every morning', 'Fresh bakes', 145, '🥐', 12),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Avocado toast', 'Sourdough · chilli flakes · greens', 'Breakfast', 260, '🥑', 8),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Orange cold brew', 'Slow-steeped for 18 hours', 'Coffee & tea', 210, '🧋', 10),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000002', 'Country sourdough loaf', 'Naturally leavened · 700 g', 'Breads', 290, '🍞', 9),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 'Cinnamon morning bun', 'Brown sugar · cinnamon · butter', 'Pastries', 125, '🥮', 15),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000003', 'Weekend farm box', 'Seasonal vegetables · serves 2', 'Vegetables', 399, '🥬', 14),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000003', 'Ooty strawberries', 'Fresh-picked · 250 g', 'Fruits', 180, '🍓', 11),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000004', 'The Art of Noticing', 'A lovely little book for slow days', 'Books', 499, '📖', 7),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000004', 'Everyday journal', 'Recycled paper · 160 pages', 'Notebooks', 320, '📔', 20),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000005', 'The Sunday bunch', 'Seasonal blooms, wrapped with care', 'Flowers', 650, '💐', 6),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000005', 'Colourful tulips', 'A bright bunch of 8 stems', 'Flowers', 520, '🌷', 12)
on conflict (id) do nothing;

insert into public.ads (id, business_id, title, message, status)
values (
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Coffee & a cookie on us',
  'Enjoy a free cookie with any coffee today.',
  'live'
)
on conflict (id) do nothing;

create index businesses_status_category_idx on public.businesses(status, category);
create index businesses_owner_id_idx on public.businesses(owner_id);
create index products_business_id_idx on public.products(business_id);
create index orders_customer_id_created_at_idx on public.orders(customer_id, created_at desc);
create index orders_business_id_created_at_idx on public.orders(business_id, created_at desc);
create index ads_status_created_at_idx on public.ads(status, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.sync_approved_business_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null and new.status is distinct from old.status then
    update public.profiles
    set role = case when new.status = 'approved' then 'business' else 'customer' end
    where id = new.owner_id and role <> 'admin';
  end if;
  return new;
end;
$$;

create trigger businesses_sync_owner_role
  after update of status on public.businesses
  for each row execute procedure public.sync_approved_business_role();

create or replace function public.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
    or new.total is distinct from old.total
    or new.created_at is distinct from old.created_at then
    raise exception 'Order details cannot be changed after checkout';
  end if;

  if not exists (
    select 1 from public.businesses
    where id = old.business_id and owner_id = (select auth.uid())
  ) then
    raise exception 'Only the shop owner can update this order';
  end if;

  if not (
    (old.status = 'New' and new.status in ('Accepted', 'Cancelled'))
    or (old.status = 'Accepted' and new.status = 'Ready')
    or (old.status = 'Ready' and new.status = 'Completed')
  ) then
    raise exception 'Invalid order status transition';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_guard_update
  before update on public.orders
  for each row execute procedure public.guard_order_update();

create or replace function public.return_cancelled_order_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'Cancelled' and new.status = 'Cancelled' then
    update public.products p
    set stock = p.stock + i.quantity
    from public.order_items i
    where i.order_id = new.id
      and i.product_id = p.id;
  end if;
  return new;
end;
$$;

create trigger orders_return_stock
  after update of status on public.orders
  for each row execute procedure public.return_cancelled_order_stock();

create or replace function public.place_order(
  p_business_id uuid,
  p_customer_name text,
  p_phone text,
  p_branch text,
  p_fulfillment text,
  p_note text,
  p_items jsonb
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
    id, customer_id, business_id, customer_name, phone, branch, fulfillment, note, total
  ) values (
    v_order_id, (select auth.uid()), p_business_id, trim(p_customer_name), trim(p_phone),
    trim(p_branch), p_fulfillment, left(coalesce(p_note, ''), 500), v_total
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

revoke all on function public.place_order(uuid, text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text, jsonb) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.follows enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ads enable row level security;

grant select on public.businesses, public.products, public.ads to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.businesses, public.products to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant insert, update, delete on public.ads to authenticated;

create policy "Profiles are visible to their owner or administrators"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users update only their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select public.current_app_role()));
create policy "Administrators manage profiles"
  on public.profiles for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Approved businesses are public"
  on public.businesses for select to anon, authenticated
  using (status = 'approved' or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Authenticated users submit pending businesses"
  on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'pending');
create policy "Owners update their approved business details"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'approved')
  with check (owner_id = (select auth.uid()) and status = 'approved');
create policy "Administrators manage businesses"
  on public.businesses for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Products for approved businesses are public"
  on public.products for select to anon, authenticated
  using (
    exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved')
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "Owners manage products in their approved business"
  on public.products for all to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = (select auth.uid()) and b.status = 'approved'
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = (select auth.uid()) and b.status = 'approved'
  ));
create policy "Administrators manage products"
  on public.products for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Customers manage their follows"
  on public.follows for all to authenticated
  using (customer_id = (select auth.uid()))
  with check (
    customer_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved')
  );

create policy "Customers and shop owners read related orders"
  on public.orders for select to authenticated
  using (
    customer_id = (select auth.uid())
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "Shop owners update their order status"
  on public.orders for update to authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_id = (select auth.uid())
  ));
create policy "Administrators manage orders"
  on public.orders for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Customers and shop owners read order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = (select auth.uid())
          or exists (select 1 from public.businesses b where b.id = o.business_id and b.owner_id = (select auth.uid()))
        )
    )
    or (select public.is_admin())
  );
create policy "Administrators manage order items"
  on public.order_items for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Live promotions are public"
  on public.ads for select to anon, authenticated
  using (
    status = 'live'
    or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "Owners submit promotions for review"
  on public.ads for insert to authenticated
  with check (
    status = 'pending'
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()) and b.status = 'approved')
  );
create policy "Owners remove pending promotions"
  on public.ads for delete to authenticated
  using (
    status = 'pending'
    and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid()))
  );
create policy "Administrators manage promotions"
  on public.ads for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

alter table public.orders
  alter column customer_id drop not null;

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
grant execute on function public.place_order(uuid, text, text, text, text, text, jsonb, text) to anon, authenticated;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('New', 'Accepted', 'Preparing', 'Ready', 'On the way', 'Completed', 'Cancelled'));

create table public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review text not null default '' check (char_length(review) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_id)
);

create index business_reviews_business_created_idx
  on public.business_reviews(business_id, created_at desc);

create or replace function public.guard_business_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.business_id is distinct from old.business_id
      or new.customer_id is distinct from old.customer_id
      or new.created_at is distinct from old.created_at then
      raise exception 'A review cannot be reassigned';
    end if;
  end if;

  if not public.is_admin()
    and not exists (
      select 1
      from public.businesses b
      where b.id = new.business_id
        and b.status = 'approved'
        and b.owner_id is distinct from (select auth.uid())
    ) then
    raise exception 'Only customers can review an approved business';
  end if;

  new.review := left(trim(coalesce(new.review, '')), 500);
  new.updated_at := now();
  return new;
end;
$$;

create trigger business_reviews_guard
  before insert or update on public.business_reviews
  for each row execute procedure public.guard_business_review();

create or replace function public.refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  if tg_op <> 'INSERT' then
    v_business_id := old.business_id;
    update public.businesses b
    set rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.business_reviews r
      where r.business_id = v_business_id
    ), 0),
    reviews = (
      select count(*)::integer
      from public.business_reviews r
      where r.business_id = v_business_id
    )
    where b.id = v_business_id;
  end if;

  if tg_op <> 'DELETE' then
    v_business_id := new.business_id;
    update public.businesses b
    set rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.business_reviews r
      where r.business_id = v_business_id
    ), 0),
    reviews = (
      select count(*)::integer
      from public.business_reviews r
      where r.business_id = v_business_id
    )
    where b.id = v_business_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger business_reviews_refresh_rating
  after insert or update or delete on public.business_reviews
  for each row execute procedure public.refresh_business_rating();

create or replace function public.guard_business_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if not public.is_admin() and (
    new.id is distinct from old.id
    or new.owner_id is distinct from old.owner_id
    or new.status is distinct from old.status
    or new.rating is distinct from old.rating
    or new.reviews is distinct from old.reviews
    or new.verified is distinct from old.verified
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Only administrators can change approval and rating fields';
  end if;
  return new;
end;
$$;

create trigger businesses_guard_update
  before update on public.businesses
  for each row execute procedure public.guard_business_update();

alter table public.business_reviews enable row level security;
grant select on public.business_reviews to anon, authenticated;
grant insert, update, delete on public.business_reviews to authenticated;

create policy "Reviews for approved shops are public"
  on public.business_reviews for select to anon, authenticated
  using (exists (
    select 1 from public.businesses b
    where b.id = business_id and b.status = 'approved'
  ));

create policy "Customers review approved shops"
  on public.business_reviews for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'customer'
    )
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.status = 'approved'
        and b.owner_id is distinct from (select auth.uid())
    )
  );

create policy "Customers edit their own reviews"
  on public.business_reviews for update to authenticated
  using (customer_id = (select auth.uid()))
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'customer'
    )
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.status = 'approved'
        and b.owner_id is distinct from (select auth.uid())
    )
  );

create policy "Customers delete their own reviews"
  on public.business_reviews for delete to authenticated
  using (customer_id = (select auth.uid()));

create policy "Administrators manage business reviews"
  on public.business_reviews for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

update public.businesses b
set rating = coalesce((
  select round(avg(r.rating)::numeric, 1)
  from public.business_reviews r
  where r.business_id = b.id
), 0),
reviews = (
  select count(*)::integer
  from public.business_reviews r
  where r.business_id = b.id
);

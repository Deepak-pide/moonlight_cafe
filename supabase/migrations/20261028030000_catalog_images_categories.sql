alter table public.businesses
  add column if not exists image_url text not null default '';

alter table public.products
  add column if not exists image_url text not null default '';

create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create index if not exists business_categories_business_id_idx
  on public.business_categories(business_id);

alter table public.business_categories enable row level security;

grant select on public.business_categories to anon, authenticated;
grant insert, update, delete on public.business_categories to authenticated;

drop policy if exists "Public categories for approved businesses" on public.business_categories;
create policy "Public categories for approved businesses"
  on public.business_categories for select to anon, authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.status = 'approved'
    )
    or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid())
    )
    or (select public.is_admin())
  );

drop policy if exists "Owners manage categories in their approved business" on public.business_categories;
create policy "Owners manage categories in their approved business"
  on public.business_categories for all to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid()) and b.status = 'approved'
    )
    or (select public.is_admin())
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = (select auth.uid()) and b.status = 'approved'
    )
    or (select public.is_admin())
  );

delete from public.ads
where id = '20000000-0000-4000-8000-000000000001';

delete from public.products
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000012'
);

delete from public.businesses b
where b.id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005'
)
and b.owner_id is null
and not exists (
  select 1 from public.orders o where o.business_id = b.id
);

insert into public.business_categories (business_id, name)
select distinct p.business_id, btrim(p.category)
from public.products p
where btrim(p.category) <> ''
on conflict (business_id, name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-images',
  'business-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public business images are readable" on storage.objects;
create policy "Public business images are readable"
  on storage.objects for select to public
  using (bucket_id = 'business-images');

drop policy if exists "Business owners upload images" on storage.objects;
create policy "Business owners upload images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-images'
    and (
      exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.owner_id = (select auth.uid())
          and b.status = 'approved'
      )
      or (select public.is_admin())
    )
  );

drop policy if exists "Business owners update images" on storage.objects;
create policy "Business owners update images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-images'
    and (
      exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.owner_id = (select auth.uid())
          and b.status = 'approved'
      )
      or (select public.is_admin())
    )
  )
  with check (
    bucket_id = 'business-images'
    and (
      exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.owner_id = (select auth.uid())
          and b.status = 'approved'
      )
      or (select public.is_admin())
    )
  );

drop policy if exists "Business owners delete images" on storage.objects;
create policy "Business owners delete images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-images'
    and (
      exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(name))[1]
          and b.owner_id = (select auth.uid())
          and b.status = 'approved'
      )
      or (select public.is_admin())
    )
  );

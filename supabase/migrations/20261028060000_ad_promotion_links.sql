alter table public.ads
  add column if not exists link_url text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ads_link_url_http_check'
      and conrelid = 'public.ads'::regclass
  ) then
    alter table public.ads
      add constraint ads_link_url_http_check
      check (link_url = '' or link_url ~* '^https?://');
  end if;
end;
$$;

drop policy if exists "Owners edit pending promotions" on public.ads;
create policy "Owners edit pending promotions"
  on public.ads for update to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = (select auth.uid())
        and b.status = 'approved'
    )
  )
  with check (
    status = 'pending'
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.owner_id = (select auth.uid())
        and b.status = 'approved'
    )
  );

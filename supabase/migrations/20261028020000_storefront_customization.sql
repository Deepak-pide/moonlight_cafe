alter table public.businesses
  add column if not exists theme_style text not null default 'solid',
  add column if not exists theme_colors jsonb;

update public.businesses
set theme_colors = case theme
  when 'green' then '{"accent":"#347a4b","surface":"#eaf4ec","ink":"#214d30"}'::jsonb
  when 'maroon' then '{"accent":"#783446","surface":"#f5e9ec","ink":"#4d202d"}'::jsonb
  else '{"accent":"#79533b","surface":"#f4ece6","ink":"#38271d"}'::jsonb
end
where theme_colors is null;

alter table public.businesses
  alter column theme_colors set default '{"accent":"#79533b","surface":"#f4ece6","ink":"#38271d"}'::jsonb,
  alter column theme_colors set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_theme_style_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_theme_style_check
      check (theme_style in ('solid', 'gradient', 'glass'));
  end if;
end;
$$;

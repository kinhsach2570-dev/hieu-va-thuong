-- Hiểu và Thương: chạy toàn bộ trong Supabase SQL Editor.
-- Có thể chạy lại; nâng cấp cả bản cơ sở dữ liệu cũ mà không xóa bài đã đăng.
begin;
create table if not exists public.admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists "admins read own membership" on public.admins;
create policy "admins read own membership" on public.admins for select to authenticated using (user_id = (select auth.uid()));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create table if not exists public.resources (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('kinh','sach','video')),
 title text not null check (char_length(trim(title)) between 1 and 200),
 author text not null default '' check (char_length(author)<=200),
 description text not null default '' check (char_length(description)<=1000),
 body text not null default '',
 url text check(url is null or url ~ '^https://'),
 file_path text,
 created_at timestamptz not null default now(),
 check(kind <> 'video' or url is not null),
 check(kind = 'video' or char_length(trim(body))>0 or url is not null or file_path is not null)
);
alter table public.resources add column if not exists cover_path text;
alter table public.resources add column if not exists cover_url text;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.resources'::regclass and conname='resources_cover_url_https') then
  alter table public.resources add constraint resources_cover_url_https check (cover_url is null or cover_url ~ '^https://');
 end if;
end $$;
alter table public.resources enable row level security;
revoke all on public.resources from anon, authenticated;
grant select on public.resources to anon, authenticated;
grant insert, update, delete on public.resources to authenticated;
drop policy if exists "visitors read resources" on public.resources;
drop policy if exists "admins insert resources" on public.resources;
drop policy if exists "admins update resources" on public.resources;
drop policy if exists "admins delete resources" on public.resources;
create policy "visitors read resources" on public.resources for select to anon, authenticated using (true);
create policy "admins insert resources" on public.resources for insert to authenticated with check (public.is_admin());
create policy "admins update resources" on public.resources for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete resources" on public.resources for delete to authenticated using (public.is_admin());
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents','documents',true,20971520,array['application/pdf']),
       ('covers','covers',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "admins upload pdf" on storage.objects;
drop policy if exists "admins delete pdf" on storage.objects;
drop policy if exists "admins list pdf" on storage.objects;
drop policy if exists "hvt admins upload files" on storage.objects;
drop policy if exists "hvt admins delete files" on storage.objects;
drop policy if exists "hvt admins read files" on storage.objects;
create policy "hvt admins upload files" on storage.objects for insert to authenticated with check (bucket_id in ('documents','covers') and public.is_admin());
create policy "hvt admins delete files" on storage.objects for delete to authenticated using (bucket_id in ('documents','covers') and public.is_admin());
create policy "hvt admins read files" on storage.objects for select to authenticated using (bucket_id in ('documents','covers') and public.is_admin());
commit;
-- Cấp tài khoản quản trị theo file grant-admin.sql SAU KHI tạo user ở Authentication.

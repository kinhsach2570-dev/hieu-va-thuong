-- Chạy SAU schema.sql và upgrade-chapters.sql. Không xóa nội dung cũ.
begin;
alter table public.section_drafts drop constraint if exists section_drafts_label_check;
alter table public.section_drafts add constraint section_drafts_label_check check(label in ('','Chương','Phẩm'));
alter table public.published_sections drop constraint if exists published_sections_label_check;
alter table public.published_sections add constraint published_sections_label_check check(label in ('','Chương','Phẩm'));
create table if not exists public.site_branding(
 id integer primary key default 1 check(id=1),
 hero_path text,hero_url text,logo_path text,logo_url text,favicon_path text,favicon_url text,
 hero_alt text not null default 'Hồ sen bình yên dưới ánh bình minh',
 hero_position text not null default 'right' check(hero_position in ('left','center','right')),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 check(hero_url is null or hero_url ~ '^https://'),
 check(logo_url is null or logo_url ~ '^https://'),
 check(favicon_url is null or favicon_url ~ '^https://'),
 check(char_length(hero_alt)<=300)
);
insert into public.site_branding(id) values(1) on conflict do nothing;
alter table public.site_branding enable row level security;
revoke all on public.site_branding from anon,authenticated;
grant select on public.site_branding to anon,authenticated;
grant update on public.site_branding to authenticated;
drop policy if exists "hvt read branding" on public.site_branding;
create policy "hvt read branding" on public.site_branding for select to anon,authenticated using(true);
drop policy if exists "hvt change branding" on public.site_branding;
create policy "hvt change branding" on public.site_branding for update to authenticated using(public.is_admin()) with check(public.is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('branding','branding',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "hvt upload branding" on storage.objects;
create policy "hvt upload branding" on storage.objects for insert to authenticated with check(bucket_id='branding' and public.is_admin());
drop policy if exists "hvt delete branding" on storage.objects;
create policy "hvt delete branding" on storage.objects for delete to authenticated using(bucket_id='branding' and public.is_admin());
drop policy if exists "hvt read branding objects" on storage.objects;
create policy "hvt read branding objects" on storage.objects for select to authenticated using(bucket_id='branding' and public.is_admin());
-- Chỉ Edge Function với service_role được cấp/thu hồi quyền admin.
create or replace function public.set_member_admin(p_actor uuid,p_target uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(73925,1);
 if not exists(select 1 from public.admins where user_id=p_actor) then raise exception 'Người thực hiện không còn quyền quản trị.';end if;
 if not exists(select 1 from auth.users where id=p_target) then raise exception 'Tài khoản không tồn tại.';end if;
 if p_actor=p_target and not p_enabled then raise exception 'Không thể tự thu hồi quyền quản trị của mình.';end if;
 if p_enabled then insert into public.admins(user_id) values(p_target) on conflict do nothing;
 else delete from public.admins where user_id=p_target;end if;
end $$;
revoke all on function public.set_member_admin(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_member_admin(uuid,uuid,boolean) to service_role;
grant select,insert,update,delete on public.admins to service_role;
commit;

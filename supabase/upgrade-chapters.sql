-- Nâng cấp Chương/Phẩm và soạn thảo có định dạng. Chạy một lần hoặc chạy lại an toàn.
-- Không xóa hoặc chuyển đổi nội dung đã có.
begin;
alter table public.resources add column if not exists body_html text not null default '';
alter table public.resources add column if not exists reading_mode text not null default 'single';
do $$ declare c record; begin
 if not exists(select 1 from pg_constraint where conrelid='public.resources'::regclass and conname='resources_reading_mode') then
  alter table public.resources add constraint resources_reading_mode check(reading_mode in ('single','sections'));
 end if;
 for c in select conname from pg_constraint where conrelid='public.resources'::regclass and contype='c' and pg_get_constraintdef(oid) like '%char_length%body%' loop
  execute format('alter table public.resources drop constraint %I',c.conname);
 end loop;
 if not exists(select 1 from pg_constraint where conrelid='public.resources'::regclass and conname='resources_content_required') then
  alter table public.resources add constraint resources_content_required check(kind='video' or reading_mode='sections' or char_length(trim(body))>0 or url is not null or file_path is not null);
 end if;
end $$;
create table if not exists public.section_drafts(
 id uuid primary key,
 resource_id uuid not null references public.resources(id) on delete cascade,
 label text not null check(label in ('Chương','Phẩm')),
 number integer not null check(number between 1 and 99999),
 title text not null default '' check(char_length(title)<=200),
 body_html text not null default '',
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now(),
 unique(resource_id,label,number)
);
create table if not exists public.published_sections(
 id uuid primary key references public.section_drafts(id) on delete cascade,
 resource_id uuid not null references public.resources(id) on delete cascade,
 label text not null check(label in ('Chương','Phẩm')),
 number integer not null check(number between 1 and 99999),
 title text not null default '',
 body_html text not null,
 source_version integer not null,
 published_at timestamptz not null default now()
);
create index if not exists published_sections_order on public.published_sections(resource_id,number);
create index if not exists section_drafts_resource on public.section_drafts(resource_id);
alter table public.section_drafts enable row level security;
alter table public.published_sections enable row level security;
revoke all on public.section_drafts from anon,authenticated;
revoke all on public.published_sections from anon,authenticated;
grant select,insert,update,delete on public.section_drafts to authenticated;
grant select on public.published_sections to anon,authenticated;
grant insert,update,delete on public.published_sections to authenticated;
drop policy if exists "hvt private section drafts" on public.section_drafts;
create policy "hvt private section drafts" on public.section_drafts for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "hvt public sections" on public.published_sections;
create policy "hvt public sections" on public.published_sections for select to anon,authenticated using(true);
drop policy if exists "hvt manage published sections" on public.published_sections;
create policy "hvt manage published sections" on public.published_sections for all to authenticated using(public.is_admin()) with check(public.is_admin());
create or replace function public.save_section_draft(p_id uuid,p_resource_id uuid,p_label text,p_number integer,p_title text,p_body_html text,p_expected_version integer)
returns public.section_drafts language plpgsql security invoker set search_path='' as $$
declare result public.section_drafts;
begin
 if not public.is_admin() then raise exception 'Bạn chưa có quyền quản trị.'; end if;
 if not exists(select 1 from public.resources where id=p_resource_id and kind in ('kinh','sach') and reading_mode='sections') then raise exception 'Hãy lưu Kinh/Sách ở chế độ Chương/Phẩm trước.'; end if;
 if p_expected_version=0 then
  insert into public.section_drafts(id,resource_id,label,number,title,body_html) values(p_id,p_resource_id,p_label,p_number,trim(p_title),p_body_html) returning * into result;
 else
  update public.section_drafts set label=p_label,number=p_number,title=trim(p_title),body_html=p_body_html,version=version+1,updated_at=now()
  where id=p_id and resource_id=p_resource_id and version=p_expected_version returning * into result;
  if not found then raise exception 'Bản này đã được cập nhật ở phiên khác. Hãy tải lại trước khi sửa để tránh ghi đè.'; end if;
 end if;
 return result;
end $$;
create or replace function public.publish_section(p_id uuid,p_expected_version integer)
returns public.published_sections language plpgsql security invoker set search_path='' as $$
declare draft public.section_drafts; result public.published_sections;
begin
 if not public.is_admin() then raise exception 'Bạn chưa có quyền quản trị.'; end if;
 select * into draft from public.section_drafts where id=p_id for update;
 if not found or draft.version<>p_expected_version then raise exception 'Bản nháp đã thay đổi. Hãy tải lại trước khi công khai.'; end if;
 if char_length(trim(regexp_replace(replace(draft.body_html,'&nbsp;',' '),'<[^>]*>','','g')))=0 then raise exception 'Vui lòng nhập nội dung trước khi công khai.'; end if;
 if not exists(select 1 from public.resources where id=draft.resource_id and kind in ('kinh','sach') and reading_mode='sections') then raise exception 'Kinh/Sách không ở chế độ Chương/Phẩm.'; end if;
 insert into public.published_sections(id,resource_id,label,number,title,body_html,source_version,published_at)
 values(draft.id,draft.resource_id,draft.label,draft.number,draft.title,draft.body_html,draft.version,now())
 on conflict(id) do update set label=excluded.label,number=excluded.number,title=excluded.title,body_html=excluded.body_html,source_version=excluded.source_version,published_at=excluded.published_at
 returning * into result;
 return result;
end $$;
revoke all on function public.save_section_draft(uuid,uuid,text,integer,text,text,integer) from public,anon;
revoke all on function public.publish_section(uuid,integer) from public,anon;
grant execute on function public.save_section_draft(uuid,uuid,text,integer,text,text,integer) to authenticated;
grant execute on function public.publish_section(uuid,integer) to authenticated;
commit;

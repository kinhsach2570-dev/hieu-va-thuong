-- 1. Supabase Dashboard → Authentication → Users → Add user → Create new user.
-- Tạo bằng email và mật khẩu của bạn, xác nhận email (Auto Confirm User nếu có).
-- 2. Thay YOUR_EMAIL_HERE bên dưới, chạy toàn bộ trong SQL Editor.
-- File này không đặt hoặc chứa mật khẩu.
do $$
declare target_id uuid;
begin
 select id into target_id from auth.users where lower(email)=lower('YOUR_EMAIL_HERE');
 if target_id is null then raise exception 'Chưa có tài khoản email này trong Authentication → Users. Hãy tạo user và thay YOUR_EMAIL_HERE.'; end if;
 insert into public.admins(user_id) values(target_id) on conflict do nothing;
end $$;

# Hiểu và Thương — V4: Trang tiếp theo, giao diện và thành viên

Gói cập nhật giữ nguyên nội dung cũ. KHÔNG ghi đè `dist/config.js`, `wrangler.toml`, `wrangler.jsonc` hoặc cấu hình Cloudflare đang chạy. Gói ZIP không chứa config.js.

## 1. Nâng cấp dữ liệu Supabase

Nếu đã cài bản Chương/Phẩm, chỉ chạy `supabase/upgrade-pages-branding-members.sql` trong Supabase → SQL Editor.

Nếu chưa cài bản Chương/Phẩm, chạy `supabase/upgrade-chapters.sql` trước, rồi chạy `supabase/upgrade-pages-branding-members.sql`. Không chạy lại file cấp tài khoản quản trị nếu đã đăng nhập được.

Website mới hoàn toàn cần chạy lần lượt schema.sql, upgrade-chapters.sql, upgrade-pages-branding-members.sql, sau đó tạo user và grant-admin.sql.

## 2. Cập nhật GitHub / Cloudflare

Giải nén ZIP. Upload các thư mục `dist` và `supabase` bên trong gói vào đúng gốc repository (không thêm tầng thư mục bao ngoài), chọn Commit changes. Giữ config.js và thiết lập Worker hiện tại. Chờ Cloudflare Ready, mở trang admin rồi Ctrl + F5.

Ảnh hồ sen bạn cung cấp đã được tối ưu tại `dist/assets/home-lotus.webp`, dùng làm ảnh trang chủ mặc định. Không cần tự tải ảnh này vào Supabase trước.

## 3. Viết tiếp mà không cần Chương/Phẩm

- Tạo hoặc chỉnh sửa Kinh/Sách → chọn “Viết tiếp nhiều trang · Chương/Phẩm tùy chọn”, lưu thông tin chung.
- Tại “Loại phần”, chọn “Không dùng Chương/Phẩm — viết theo trang”.
- Nhập thứ tự trang và nội dung; tên trang không bắt buộc. Trang không có tên sẽ hiển thị là Trang 1, Trang 2…
- Lưu bản nháp hoặc Lưu & công khai phần này. Nhấn “+ Trang / phần mới” để tiếp tục. Các trang trước không bị ghi đè.
- Có thể chọn Chương/Phẩm ở từng phần nếu cần. Bản nháp và bản công khai vẫn tách biệt như bản trước.
- Hãy lưu bản nháp trước khi đóng trang; không có tự động lưu.

## 4. Thay ảnh trang chủ, logo, favicon

Đăng nhập → tab “Giao diện & hình ảnh”. Chọn file PNG/JPG/WebP tối đa 5 MB hoặc điền URL HTTPS, xem trước rồi chọn “Lưu giao diện”.

- Ảnh trang chủ có tùy chọn trọng tâm trái/giữa/phải, mô tả ảnh và quay lại mặc định.
- Logo giữ nền trong suốt khi tải PNG/WebP.
- Favicon tự chuyển thành PNG vuông 256 px; nên dùng hình đơn giản, ít chi tiết. Không cần tạo file ICO.
- Thay đổi lưu vào Supabase và áp dụng khi người xem tải lại trang; không cần commit GitHub cho mỗi lần đổi ảnh. Favicon có thể cần đóng/mở lại tab hoặc Ctrl + F5 vì bộ nhớ đệm của trình duyệt.
- File cũ được giữ trong bucket branding để tránh làm hỏng ảnh đang lưu trong bộ nhớ đệm; có thể dọn thủ công sau khi kiểm tra.

## 5. Bật chức năng quản lý thành viên (cần làm thêm một lần)

Phần này chạy phía máy chủ Supabase. Không đặt service_role/secret key trong config.js hay bất kỳ file nào của dist.

### Cách A — Supabase Dashboard, không cần cài CLI

1. Trong Supabase project đang dùng → Edge Functions → Deploy a new function → Via Editor (hoặc chức năng tương đương).
2. Đặt tên chính xác: `manage-members`.
3. Mở file `supabase/functions/manage-members/dashboard.ts` trong gói. Copy TOÀN BỘ nội dung vào file index.ts của trình soạn thảo Supabase, thay nội dung mẫu, rồi Deploy.
4. Trong cấu hình của hàm này, đặt kiểm tra JWT ở gateway thành tắt (`verify_jwt = false`). Đây là cấu hình dành riêng cho hàm này: mã bên trong vẫn bắt buộc JWT của người dùng, xác minh JWT qua Supabase Auth và kiểm tra quyền admin trước từng yêu cầu. Không tắt RLS của bảng dữ liệu.
5. Trong Edge Functions → Secrets, thêm:
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://hieu-va-thuong.kinhsach2570.workers.dev`
6. Nếu dùng thêm tên miền khác, thêm đúng origin đó, ngăn bằng dấu phẩy. Chỉ hostname và giao thức, không thêm `/admin` hay dấu `/` cuối. Ví dụ: `https://hieu-va-thuong.kinhsach2570.workers.dev,https://tenmiencuaban.vn`.
7. Supabase cung cấp sẵn SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY cho Edge Functions. Không copy các giá trị đó vào trình duyệt.
8. Trở lại admin → Thành viên → Làm mới danh sách. Đăng thử một tài khoản thành viên kiểm thử để xác nhận cấu hình thực tế.

### Cách B — Supabase CLI (nếu đã có)

Chạy từ gốc dự án đã giải nén, đăng nhập tài khoản của bạn:

```sh
supabase login
supabase link --project-ref lqlfcfguemllbsoubtvg
supabase functions deploy manage-members --no-verify-jwt
supabase secrets set ALLOWED_ORIGINS=https://hieu-va-thuong.kinhsach2570.workers.dev
```

Giữ/ghép cấu hình `[functions.manage-members]` từ supabase/config.toml nếu dự án đã có file config.toml riêng; không thay cấu hình các hàm khác.

## 6. Sử dụng Thành viên

- Thêm: tên, email, mật khẩu 12–128 ký tự, vai trò Thành viên hoặc Quản trị viên. Email được xác nhận bởi quản trị; không gửi thư mời tự động.
- Sửa: đổi tên, email, vai trò; để trống mật khẩu để giữ mật khẩu hiện có. Nếu đổi email/mật khẩu của chính bạn, đăng xuất rồi đăng nhập lại bằng thông tin mới.
- Xóa: bấm Xóa rồi nhập lại email xác nhận. Tài khoản và quyền truy cập bị xóa, bài đã đăng được giữ.
- Không tự xóa tài khoản đang đăng nhập hoặc tự thu hồi quyền quản trị. Thành viên thông thường không đăng nhập được vào admin portal; khách vẫn xem thư viện công khai.
- Nếu Supabase không cho xóa tài khoản do tài khoản đang sở hữu file Storage, chức năng báo lỗi và cố gắng giữ lại quyền quản trị trước đó. Không tự xóa file của tài khoản để tránh mất tài liệu; kiểm tra trong Supabase trước khi xử lý tiếp.

## 7. Kiểm tra sau cài đặt

1. Trang 1 công khai; Trang 2 lưu nháp; tải lại và xác nhận Trang 1 còn nguyên, Trang 2 chỉ thấy trong quản trị.
2. Đổi ảnh/Logo/favicon; mở thư viện bằng thiết bị khác.
3. Tạo/sửa/xóa tài khoản kiểm thử; xác nhận thành viên không có quyền quản trị.
4. Giữ nguyên admin chính. Không đặt khóa máy chủ trong mã frontend.

Kiểm thử đã thực hiện trên PostgreSQL WASM, trình duyệt và giả lập Supabase Auth Admin API. Supabase/Cloudflare cá nhân cần cài nâng cấp và Edge Function để hoạt động tại URL riêng của bạn; bản xem trước ChatGPT không tự cập nhật GitHub cá nhân.

Tài liệu chính thức:
- https://supabase.com/docs/guides/functions/quickstart-dashboard
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/reference/javascript/auth-admin-createuser
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

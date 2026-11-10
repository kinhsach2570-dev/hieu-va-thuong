# Hiểu và Thương — thư viện & quản trị

## Bắt đầu

1. Mở `dist/huong-dan.html` để đọc hướng dẫn đầy đủ bằng tiếng Việt (cũng có trên website tại `/huong-dan.html`).
2. Tạo Supabase project. Chạy `supabase/schema.sql` trong SQL Editor; file chạy lại được và nâng cấp cơ sở dữ liệu cũ, không xóa nội dung.
3. Tạo user đã xác nhận email trong Authentication. Thay email trong `supabase/grant-admin.sql`, chạy file để cấp quyền.
4. Điền Project URL và publishable/anon key vào `dist/config.js`. Không sử dụng secret/service_role key hoặc mật khẩu trong mã nguồn.
5. Upload `dist/`, `supabase/`, `README.md` lên gốc repository GitHub. Không upload file ZIP như một file website.
6. Cloudflare Pages → Connect to Git → chọn repo → branch main → Framework None → Build command `exit 0` → Output directory `dist` → Root directory để trống → Deploy.
7. Vào URL Cloudflare trả về + `/admin.html`, đăng nhập và đăng bài.

## Tính năng

- Trang chủ về hiểu, thương, hiếu thảo. Font tiếng Việt được đóng gói cùng site.
- Thư viện tìm kiếm không dấu, lọc Kinh/Sách/Video, dấu trang lưu trên thiết bị.
- Trang quản trị riêng: đăng nhập, thêm, sửa, xóa Kinh/Sách/Video.
- Kinh/Sách: văn bản thuần, PDF tối đa 20 MB, liên kết nguồn HTTPS.
- YouTube thường, Shorts, youtu.be; Vimeo; link ngoài; MP4/WebM trực tiếp. Video bị cấm nhúng vẫn có link mở nguồn.
- Ảnh bìa riêng cho cả 3 loại, từ JPG/PNG/WebP tối đa 5 MB hoặc URL HTTPS; xem trước, đổi hoặc xóa bìa. Ảnh upload được chuyển JPEG, tối đa cạnh dài 1600 px.
- Quản trị kiểm tra quyền bằng Auth + RLS của Supabase. Không có tự đăng ký hoặc tự cấp quyền quản trị.
- Phiên trong bộ nhớ, tự làm mới khi thao tác gần hết hạn; tải lại trang cần đăng nhập lại.
- Xóa/đổi file dọn file đi kèm; lỗi dọn file được báo kèm đường dẫn để kiểm tra Storage.

## Lưu trữ & vận hành

Nội dung và file lưu tại Supabase; không cần commit GitHub khi đăng bài. Thay giao diện/mã nguồn thì commit GitHub; Cloudflare Pages tự triển khai. Bucket `documents` và `covers` là public để khách đọc được; chỉ admins được upload/xóa. Kiểm tra quyền sử dụng ảnh/tài liệu trước khi đăng.

Không có bản nháp, mọi nội dung lưu thành công hiển thị công khai trên bản Cloudflare. Bản xem trước ChatGPT giữ quyền truy cập riêng hiện tại. Hai bản triển khai không tự đồng bộ mã nguồn; có thể dùng cùng dữ liệu Supabase nếu cùng cấu hình.

## Kiểm thử sau kết nối

- Khách đọc được nội dung; anonymous POST/PATCH/DELETE và upload phải bị từ chối.
- User không thuộc admins không thể ghi; admins có thể thêm/sửa/xóa.
- Thêm Kinh/Sách với văn bản, PDF và bìa; thêm video YouTube và bìa; mở từ thiết bị khác.
- Sửa giữ nguyên file cũ khi không chọn thay; đổi bìa/PDF; xóa bài và kiểm tra file được dọn.
- Xác minh đăng xuất, hết hạn session, lỗi mạng và giới hạn dung lượng.

Mã JavaScript và giao diện có thể kiểm tra trước khi kết nối. RLS, Auth và các thao tác file thực tế phải kiểm tra sau khi chủ sở hữu cấu hình Supabase thật.

Tài liệu:
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/storage/security/access-control

# Cập nhật Hiểu và Thương: Chương / Phẩm

1. Supabase → SQL Editor: copy toàn bộ `supabase/upgrade-chapters.sql`, nhấn Run. Chỉ thêm cấu trúc mới, giữ lại Kinh/Sách/video và file hiện có.
2. GitHub → repository của website → Add file → Upload files. Upload các thư mục `dist` và `supabase` bên trong gói này vào gốc repository, chọn Commit changes. Không tạo thêm tầng thư mục bao ngoài.
3. Gói cập nhật KHÔNG chứa `dist/config.js`: giữ nguyên file kết nối Supabase đã điền. Cũng giữ nguyên `wrangler.jsonc` / `wrangler.toml` hay cấu hình Worker đang dùng. Không thay build/deploy settings hiện tại.
4. Chờ Cloudflare triển khai bản mới thành Ready, mở /admin hoặc /admin.html rồi Ctrl + F5.
5. Đăng nhập. Tạo hoặc chỉnh sửa một Kinh/Sách. Chọn “Theo từng Chương / Phẩm”, lưu thông tin chung.
6. Nhập Phẩm 1, lưu nháp để viết tiếp sau hoặc “Lưu & công khai phần này” khi hoàn tất. Bấm “+ Chương / Phẩm mới” để viết Phẩm 2. Phẩm 1 vẫn được giữ.
7. Lần sau: tìm bộ Kinh/Sách → Chỉnh sửa → Viết tiếp ở đúng Phẩm/Chương. Bản sửa nháp không đổi nội dung đang công khai cho đến khi công khai lại.

Hãy bấm Lưu bản nháp trước khi đóng trang; không có tự động lưu. Thanh công cụ áp dụng cho văn bản được chọn hoặc đoạn có con trỏ: đậm, nghiêng, gạch chân, căn trái/giữa/phải, màu chữ, hoàn tác/làm lại.

Bạn không cần công khai tất cả Chương/Phẩm cùng lúc. Mục lục của người đọc chỉ liệt kê những phần đã công khai. Bản nháp không được trả về cho khách xem.

Kiểm thử đã thực hiện trên PostgreSQL WASM và giao diện trình duyệt; dự án Supabase và Worker cá nhân cần chạy nâng cấp và nhận mã mới để tính năng hoạt động tại URL của bạn. Bản xem trước ChatGPT không tự cập nhật repository GitHub/Cloudflare riêng.

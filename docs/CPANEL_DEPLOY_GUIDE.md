# Hướng Dẫn Deploy VieTool Lên cPanel Hosting

## Tổng Quan

Dự án VieTool bao gồm 2 phần:
1. **Frontend (React)**: Build thành file tĩnh, upload lên `public_html/`
2. **Backend (PHP API)**: Upload thư mục `hosting/api/` lên `public_html/api/`

---

## PHẦN 1: CHUẨN BỊ DATABASE MYSQL

### Bước 1.1: Tạo Database trên cPanel

1. Đăng nhập cPanel → **MySQL® Databases**
2. Tạo database mới:
   - Database name: `vietool_db` (hoặc tên khác)
   - Click **Create Database**
3. Tạo user mới:
   - Username: `vietool_user`
   - Password: (tạo password mạnh, lưu lại)
   - Click **Create User**
4. Gán quyền cho user:
   - Add user to database: chọn user và database vừa tạo
   - Privileges: **ALL PRIVILEGES**
   - Click **Make Changes**

### Bước 1.2: Import Schema Database

1. Vào **phpMyAdmin** từ cPanel
2. Chọn database `vietool_db`
3. Tab **Import** → chọn file `hosting/database_mysql.sql`
4. Click **Go** để import
5. Lặp lại với file `hosting/database_mysql_functions.sql`

> ⚠️ **Lưu ý**: File `database_mysql_functions.sql` chứa các stored functions.
> Nếu gặp lỗi, chạy từng block SQL một trong tab **SQL**.

---

## PHẦN 2: CẤU HÌNH PHP BACKEND

### Bước 2.1: Sửa file config.php

Mở file `hosting/api/config.php` và cập nhật:

```php
<?php
// Database Configuration - THAY ĐỔI THEO THÔNG TIN CỦA BẠN
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_cpanel_prefix_vietool_db');  // VD: abc123_vietool_db
define('DB_USER', 'your_cpanel_prefix_vietool_user'); // VD: abc123_vietool_user  
define('DB_PASS', 'your_database_password');          // Password bạn tạo ở bước 1.1
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration - ĐỔI THÀNH KEY BÍ MẬT CỦA BẠN
define('JWT_SECRET', 'your-super-secret-key-minimum-32-characters-long');
define('JWT_EXPIRY', 86400); // 24 giờ

// CORS Configuration - THÊM DOMAIN CỦA BẠN
define('ALLOWED_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://vietool.cc',           // Domain chính
    'https://www.vietool.cc',       // Với www
]);

// API Configuration
define('API_VERSION', '1.0.0');
define('DEBUG_MODE', false);  // ĐỂ false KHI PRODUCTION

// File Upload Configuration
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_PATH', __DIR__ . '/../uploads/');

// Telegram Notification (tùy chọn)
define('TELEGRAM_BOT_TOKEN', '');  // Lấy từ @BotFather
define('TELEGRAM_CHAT_ID', '');    // Chat ID nhận thông báo

// Bank API Configuration (cho auto-verify topup)
define('BANK_API_TOKEN', '');      // Lấy từ thueapibank.vn
define('BANK_API_URL', 'https://apibank.thueapibank.vn');
```

### Bước 2.2: Lấy Bank API Token (Tùy chọn - cho auto-verify)

1. Truy cập https://thueapibank.vn
2. Đăng ký tài khoản
3. Liên kết tài khoản ngân hàng Vietcombank
4. Vào **Quản lý API** → **Tạo API Token**
5. Copy token và dán vào `BANK_API_TOKEN` trong config.php

---

## PHẦN 3: UPLOAD FILES LÊN CPANEL

### Bước 3.1: Upload PHP Backend

**Cách 1: Qua File Manager**
1. cPanel → **File Manager** → `public_html`
2. Tạo thư mục `api`
3. Upload toàn bộ nội dung trong `hosting/api/` vào `public_html/api/`:
   ```
   public_html/
   └── api/
       ├── .htaccess
       ├── index.php
       ├── config.php        ← Đã sửa ở bước 2.1
       ├── Database.php
       ├── JWT.php
       ├── Response.php
       └── endpoints/
           ├── admin.php
           ├── auth.php
           ├── blog.php
           ├── categories.php
           ├── checkout.php
           ├── entitlements.php
           ├── orders.php
           ├── products.php
           ├── settings.php
           ├── topup.php
           ├── upload.php
           └── wallet.php
   ```

**Cách 2: Qua FTP**
1. Kết nối FTP với thông tin từ cPanel
2. Upload thư mục `hosting/api/` → `public_html/api/`

### Bước 3.2: Tạo thư mục uploads

1. Trong `public_html/`, tạo thư mục `uploads`
2. Bên trong `uploads/`, tạo 3 thư mục con:
   ```
   public_html/
   └── uploads/
       ├── products/
       ├── blog/
       └── general/
   ```
3. Đặt quyền cho thư mục uploads: **755** hoặc **775**

### Bước 3.3: Kiểm tra API hoạt động

Truy cập: `https://yourdomain.com/api/health`

Kết quả mong đợi:
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "status": "ok",
    "version": "1.0.0"
  }
}
```

---

## PHẦN 4: BUILD VÀ UPLOAD FRONTEND

### Bước 4.1: Cấu hình biến môi trường

File `.env.production` (đã tạo sẵn):
```env
VITE_API_URL=https://vietool.cc/api
```

> Thay `vietool.cc` thành domain của bạn

### Bước 4.2: Build Frontend

**Cách 1: Dùng Lovable (Khuyến nghị)**
1. Trong Lovable, click **Publish**
2. Frontend sẽ được deploy tự động
3. Tải về bản build từ GitHub nếu cần

**Cách 2: Build thủ công**
```bash
# Clone repo từ GitHub
git clone https://github.com/your-username/vietool.git
cd vietool

# Cài dependencies
npm install

# Build production
npm run build
```

### Bước 4.3: Upload Frontend lên cPanel

1. Upload toàn bộ nội dung thư mục `dist/` vào `public_html/`:
   ```
   public_html/
   ├── index.html
   ├── favicon.ico
   ├── robots.txt
   ├── .htaccess          ← Copy từ public/.htaccess
   └── assets/
       ├── index-xxxxx.js
       └── index-xxxxx.css
   ```

2. **QUAN TRỌNG**: Copy file `public/.htaccess` vào `public_html/`
   - File này giúp SPA routing hoạt động đúng

---

## PHẦN 5: CẤU HÌNH HTACCESS

### File `public_html/.htaccess` (Frontend)

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Serve existing files directly
    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]
    
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    
    # Exclude /api from SPA routing
    RewriteCond %{REQUEST_URI} ^/api [NC]
    RewriteRule ^ - [L]
    
    # All other requests go to index.html (SPA)
    RewriteRule ^ index.html [L]
</IfModule>

Options -Indexes
```

### File `public_html/api/.htaccess` (Backend)

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /api/
    
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

Options -Indexes

<FilesMatch "^(config\.php|Database\.php|JWT\.php|Response\.php)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>
```

---

## PHẦN 6: KIỂM TRA SAU KHI DEPLOY

### Checklist

- [ ] Truy cập `https://yourdomain.com` → Trang chủ hiển thị
- [ ] Truy cập `https://yourdomain.com/api/health` → JSON response
- [ ] Đăng ký tài khoản mới → Thành công
- [ ] Đăng nhập → Thành công
- [ ] Xem danh sách sản phẩm → Hiển thị đúng
- [ ] Tạo yêu cầu nạp tiền → Tạo được mã NAP
- [ ] Trang admin hoạt động → Không có lỗi "Action not found"

### Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| CORS error | Domain chưa được thêm | Thêm domain vào `ALLOWED_ORIGINS` trong config.php |
| 500 Internal Server Error | Lỗi PHP hoặc database | Bật `DEBUG_MODE = true` để xem chi tiết |
| "Action not found" | Routing sai | Kiểm tra file index.php đã upload đúng phiên bản mới nhất |
| Không load được sản phẩm | API URL sai | Kiểm tra VITE_API_URL trong .env.production |
| Upload file lỗi | Thiếu quyền | Chmod 755 cho thư mục uploads |

---

## PHẦN 7: BẢO MẬT

### Checklist bảo mật

1. **Đổi JWT_SECRET** thành chuỗi ngẫu nhiên dài ít nhất 32 ký tự
2. **Tắt DEBUG_MODE** trong production
3. **Đặt mật khẩu mạnh** cho database user
4. **Bật HTTPS** (SSL certificate) cho domain
5. **Không commit** file config.php lên Git
6. **Backup database** định kỳ

### Tạo JWT Secret ngẫu nhiên

```bash
# Linux/Mac
openssl rand -base64 32

# Hoặc dùng online generator
# https://generate-secret.vercel.app/32
```

---

## CẤU TRÚC THƯ MỤC SAU KHI DEPLOY

```
public_html/
├── index.html              # React app entry
├── favicon.ico
├── robots.txt
├── .htaccess               # SPA routing
├── assets/
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
├── api/
│   ├── .htaccess           # API routing
│   ├── index.php           # API entry point
│   ├── config.php          # Cấu hình (đã sửa)
│   ├── Database.php
│   ├── JWT.php
│   ├── Response.php
│   └── endpoints/
│       ├── admin.php
│       ├── auth.php
│       └── ...
└── uploads/
    ├── products/
    ├── blog/
    └── general/
```

---

## HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. Error logs trong cPanel → **Errors** hoặc **Metrics > Errors**
2. Bật `DEBUG_MODE = true` tạm thời để xem lỗi chi tiết
3. Kiểm tra Console (F12) trên trình duyệt để xem lỗi JavaScript

Chúc bạn deploy thành công! 🚀

# VieTool - Hướng dẫn triển khai cPanel

## Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Chuẩn bị](#2-chuẩn-bị)
3. [Triển khai Database MySQL](#3-triển-khai-database-mysql)
4. [Triển khai API PHP](#4-triển-khai-api-php)
5. [Triển khai Frontend React](#5-triển-khai-frontend-react)
6. [Cấu hình CORS và Bảo mật](#6-cấu-hình-cors-và-bảo-mật)
7. [Kiểm tra và Debug](#7-kiểm-tra-và-debug)

---

## 1. Yêu cầu hệ thống

- PHP >= 8.0
- MySQL >= 5.7 hoặc MariaDB >= 10.3
- Apache với mod_rewrite enabled
- SSL certificate (khuyến nghị)

---

## 2. Chuẩn bị

### 2.1. Build React Frontend
```bash
npm run build
```
Kết quả sẽ nằm trong thư mục `dist/`

### 2.2. Cấu trúc upload lên hosting
```
public_html/
├── index.html          # Từ dist/
├── assets/             # Từ dist/assets/
├── .htaccess           # Từ public/.htaccess (SPA routing)
└── api/                # Từ hosting/api/
    ├── .htaccess
    ├── index.php
    ├── config.php
    ├── Database.php
    ├── JWT.php
    ├── Response.php
    └── endpoints/
        └── *.php
```

---

## 3. Triển khai Database MySQL

### 3.1. Tạo Database
1. Đăng nhập **cPanel** → **MySQL® Databases**
2. Tạo database mới: `vietool_db`
3. Tạo user mới: `vietool_user` với mật khẩu mạnh
4. **Add User to Database** với **ALL PRIVILEGES**

### 3.2. Import Schema
1. Mở **phpMyAdmin** trong cPanel
2. Chọn database vừa tạo
3. Tab **Import** → chọn file `hosting/database_mysql.sql`
4. Click **Go** để import

### 3.3. Tạo tài khoản Admin
Chạy SQL trong phpMyAdmin:
```sql
-- Tạo admin (password: admin123)
INSERT INTO profiles (id, user_id, email, full_name, password_hash, role, status, created_at, updated_at)
VALUES (
  UUID(),
  UUID(),
  'admin@yourdomain.com',
  'Administrator',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'active',
  NOW(),
  NOW()
);
```
> **Lưu ý**: Đổi email và password sau khi đăng nhập lần đầu!

---

## 4. Triển khai API PHP

### 4.1. Upload files
Upload thư mục `hosting/api/` vào `public_html/api/`

### 4.2. Cấu hình config.php
Mở `api/config.php` và chỉnh sửa:

```php
<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'tên_database_của_bạn');   // VD: vietool_db
define('DB_USER', 'user_database_của_bạn'); // VD: vietool_user  
define('DB_PASS', 'password_database');

// JWT Secret - THAY ĐỔI THÀNH CHUỖI NGẪU NHIÊN DÀI!
define('JWT_SECRET', 'thay-doi-thanh-chuoi-bi-mat-dai-32-ky-tu-tro-len');

// Allowed Origins - Thêm domain của bạn
define('ALLOWED_ORIGINS', [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'http://localhost:5173',  // Xóa dòng này khi lên production
]);

// Debug Mode - TẮT khi lên production!
define('DEBUG_MODE', false);
```

### 4.3. Kiểm tra quyền file
```
api/config.php: 644
api/*.php: 644
api/endpoints/*.php: 644
api/.htaccess: 644
```

### 4.4. Test API
Truy cập: `https://yourdomain.com/api/health`
Kết quả mong đợi: `{"success": true, "data": {"status": "ok"}}`

---

## 5. Triển khai Frontend React

### 5.1. Cấu hình API URL
Trước khi build, tạo file `.env.production`:
```env
VITE_API_URL=https://yourdomain.com/api
```

Hoặc sửa trực tiếp trong `src/lib/api.ts`:
```typescript
const API_BASE_URL = 'https://yourdomain.com/api';
```

### 5.2. Build lại Frontend
```bash
npm run build
```

### 5.3. Upload Frontend
1. Upload toàn bộ nội dung thư mục `dist/` vào `public_html/`
2. Copy `public/.htaccess` vào `public_html/.htaccess` (SPA routing)

### 5.4. Kiểm tra .htaccess cho SPA
File `.htaccess` trong `public_html/` phải có nội dung redirect về `index.html`:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api
    RewriteRule ^ index.html [L]
</IfModule>
```
> **Đây là fix cho lỗi 404 khi refresh trang (F5)**

---

## 6. Cấu hình CORS và Bảo mật

### 6.1. CORS đã được xử lý trong API
File `api/index.php` tự động xử lý CORS headers.

### 6.2. SSL
Khuyến nghị bật **Force HTTPS** trong cPanel:
- cPanel → **SSL/TLS Status** → Enable **Force HTTPS Redirect**

### 6.3. Bảo mật thêm
- Đổi `JWT_SECRET` thành chuỗi ngẫu nhiên dài
- Đặt `DEBUG_MODE = false`
- Xóa `http://localhost:5173` khỏi `ALLOWED_ORIGINS`

---

## 7. Kiểm tra và Debug

### 7.1. Kiểm tra API
```bash
# Health check
curl https://yourdomain.com/api/health

# Test login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"admin123"}'
```

### 7.2. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| 404 khi refresh | Thiếu .htaccess hoặc mod_rewrite | Upload `.htaccess` cho SPA routing |
| 500 Internal Error | Lỗi PHP hoặc config | Bật `DEBUG_MODE = true`, xem error log |
| CORS error | Origin không được phép | Thêm domain vào `ALLOWED_ORIGINS` |
| Database connection failed | Sai thông tin DB | Kiểm tra DB_HOST, DB_NAME, DB_USER, DB_PASS |
| Login không được | Sai password hash | Tạo lại user với SQL ở trên |

### 7.3. Xem Error Logs
cPanel → **Errors** hoặc **Raw Access** để xem Apache error logs.

---

## Liên hệ hỗ trợ
Nếu gặp vấn đề, vui lòng mở issue trên GitHub hoặc liên hệ developer

Gói triển khai cho cPanel hosting với MySQL database.

## Cấu trúc thư mục

```
hosting/
├── database_mysql.sql    # Schema MySQL
├── api/                  # PHP API backend
│   ├── config.php        # Cấu hình database & settings
│   ├── Database.php      # Database connection class
│   ├── JWT.php           # JWT authentication
│   ├── Response.php      # API response helper
│   ├── index.php         # Main API router
│   ├── .htaccess         # URL rewriting
│   └── endpoints/        # API endpoints
│       ├── auth.php
│       ├── products.php
│       ├── categories.php
│       ├── settings.php
│       ├── wallet.php
│       ├── topup.php
│       ├── orders.php
│       ├── checkout.php
│       ├── entitlements.php
│       ├── blog.php
│       └── admin.php
└── README.md
```

## Hướng dẫn cài đặt

### 1. Tạo Database MySQL

1. Đăng nhập cPanel → MySQL Databases
2. Tạo database mới (ví dụ: `vietool_db`)
3. Tạo user mới và gán vào database với quyền `ALL PRIVILEGES`
4. Vào phpMyAdmin → chọn database → Import → upload file `database_mysql.sql`

### 2. Upload API

1. Upload thư mục `api/` vào `public_html/api/`
2. Sửa file `api/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_database_user');
define('DB_PASS', 'your_database_password');
define('JWT_SECRET', 'your-random-secret-key-here');
```

3. Thêm domain của bạn vào `ALLOWED_ORIGINS`:

```php
define('ALLOWED_ORIGINS', [
    'https://your-domain.com',
    'https://www.your-domain.com'
]);
```

### 3. Cấu hình Frontend

Trong project React, thay đổi API URL:

```typescript
// src/lib/api.ts
const API_URL = 'https://your-domain.com/api';
```

### 4. Test API

Truy cập: `https://your-domain.com/api/health`

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

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/me` - Lấy thông tin user
- `PUT /api/auth/me` - Cập nhật profile
- `POST /api/auth/change-password` - Đổi mật khẩu

### Products
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/:id` - Chi tiết sản phẩm
- `GET /api/products/:id/assets` - Assets sản phẩm (yêu cầu entitlement)
- `POST /api/products` - Tạo sản phẩm (admin)
- `PUT /api/products/:id` - Cập nhật sản phẩm (admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (admin)

### Categories
- `GET /api/categories` - Danh sách danh mục
- `GET /api/categories/:id` - Chi tiết danh mục

### Wallet & Topup
- `GET /api/wallet/balance` - Số dư ví
- `GET /api/wallet/transactions` - Lịch sử giao dịch
- `POST /api/topup` - Tạo yêu cầu nạp tiền
- `GET /api/topup` - Danh sách yêu cầu nạp
- `POST /api/topup/:id/verify` - Xác nhận nạp tiền

### Orders & Checkout
- `POST /api/checkout` - Thanh toán
- `GET /api/orders` - Danh sách đơn hàng
- `GET /api/orders/:id` - Chi tiết đơn hàng

### Entitlements
- `GET /api/entitlements` - Sản phẩm đã mua
- `GET /api/entitlements/:id` - Chi tiết & assets

### Settings
- `GET /api/settings` - Cài đặt public
- `GET /api/settings/:key` - Cài đặt theo key
- `PUT /api/settings/:key` - Cập nhật cài đặt (admin)

### Admin
- `GET /api/admin/dashboard` - Thống kê
- `GET /api/admin/users` - Danh sách users
- `PUT /api/admin/users/:id` - Cập nhật user
- `PUT /api/admin/topups/:id` - Duyệt/từ chối nạp tiền
- `GET /api/admin/audit` - Nhật ký hoạt động

## Default Admin Account

- Email: `admin@vietool.com`
- Password: `admin123`

**⚠️ ĐỔI MẬT KHẨU NGAY SAU KHI CÀI ĐẶT!**

## Lưu ý bảo mật

1. Đổi `JWT_SECRET` trong `config.php`
2. Đổi mật khẩu admin mặc định
3. Set `DEBUG_MODE = false` trong production
4. Đảm bảo HTTPS được bật
5. Cấu hình firewall chỉ cho phép truy cập từ domain của bạn

## Troubleshooting

### Lỗi 500 Internal Server Error
- Kiểm tra error log trong cPanel
- Đảm bảo PHP version >= 7.4
- Kiểm tra quyền file (644 cho files, 755 cho folders)

### Lỗi kết nối database
- Kiểm tra thông tin database trong config.php
- Đảm bảo user có quyền truy cập database

### CORS Error
- Thêm domain vào ALLOWED_ORIGINS trong config.php
- Đảm bảo không có trailing slash

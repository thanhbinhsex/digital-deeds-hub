# VieTool Hosting Package

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

# Hướng dẫn Migration sang MySQL + PHP (cPanel Hosting)

Tài liệu này hướng dẫn cách chuyển ứng dụng VieTool từ Supabase sang MySQL + PHP API để host trên cPanel.

## ⚠️ Lưu ý quan trọng

- **Trong Lovable Preview**: App hiện đang hiển thị "Network error" vì PHP API chưa được deploy. Đây là hành vi bình thường.
- **Sau khi deploy lên cPanel**: App sẽ hoạt động đầy đủ với PHP API.

## Bước 1: Thiết lập cPanel

### 1.1 Tạo MySQL Database

1. Đăng nhập vào cPanel
2. Vào **MySQL® Databases**
3. Tạo database mới (vd: `vietool_db`)
4. Tạo user mới (vd: `vietool_user`) với password mạnh
5. Add user vào database với **ALL PRIVILEGES**

### 1.2 Import Database Schema

1. Vào **phpMyAdmin**
2. Chọn database vừa tạo
3. Vào tab **Import**
4. Upload file `hosting/database_mysql.sql`
5. Click **Go** để import

### 1.3 Upload Files

1. Vào **File Manager**
2. Điều hướng đến `public_html`
3. Upload các file sau:
   - Thư mục `hosting/api/` → `public_html/api/`
   - File `public/.htaccess` → `public_html/.htaccess`

### 1.4 Cấu hình API

1. Mở file `public_html/api/config.php`
2. Cập nhật các thông tin:

```php
// Database
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_cpanel_username_vietool_db');
define('DB_USER', 'your_cpanel_username_vietool_user');
define('DB_PASS', 'your_database_password');

// JWT - Đổi secret key
define('JWT_SECRET', 'your-unique-secret-key-min-32-chars');

// CORS - Thêm domain của bạn
define('ALLOWED_ORIGINS', [
    'https://your-domain.com',
    'https://www.your-domain.com',
]);
```

## Bước 2: Build và Deploy Frontend

### 2.1 Cấu hình API URL

Trong Lovable, thêm environment variable:
```
VITE_API_URL=https://your-domain.com/api
```

### 2.2 Build Frontend

Trong terminal:
```bash
npm run build
```

### 2.3 Upload Frontend

1. Upload toàn bộ nội dung thư mục `dist/` vào `public_html/`
2. Đảm bảo file `.htaccess` từ `public/` đã có trong `public_html/`

## Bước 3: Kiểm tra

### 3.1 Test API

Truy cập `https://your-domain.com/api/health` - phải trả về:
```json
{"success": true, "data": {"status": "ok", "version": "1.0.0"}}
```

### 3.2 Test Authentication

1. Truy cập website
2. Đăng ký tài khoản mới hoặc đăng nhập với:
   - Email: `admin@vietool.com`
   - Password: `admin123`

## API Endpoints Reference

| Supabase Query | API Client Method |
|----------------|-------------------|
| `supabase.from('products').select()` | `api.getProducts()` |
| `supabase.from('categories').select()` | `api.getCategories()` |
| `supabase.from('site_settings').select()` | `api.getSettings()` |
| `supabase.from('wallets').select()` | `api.getWalletBalance()` |
| `supabase.from('topup_requests').insert()` | `api.createTopupRequest()` |
| `supabase.functions.invoke('checkout')` | `api.checkout()` |
| `supabase.auth.signInWithPassword()` | `api.login()` |
| `supabase.auth.signUp()` | `api.register()` |
| `supabase.auth.signOut()` | `api.logout()` |

## Admin Endpoints

| Feature | API Method |
|---------|-----------|
| Dashboard Stats | `api.getAdminDashboard()` |
| Products CRUD | `api.adminGetProducts()`, `adminCreateProduct()`, etc. |
| Categories CRUD | `api.adminGetCategories()`, `adminCreateCategory()`, etc. |
| Orders | `api.adminGetOrders()` |
| Topups | `api.adminGetTopups()`, `approveTopup()`, `denyTopup()` |
| Users | `api.getAdminUsers()`, `updateAdminUser()` |
| Blog CRUD | `api.adminGetBlogPosts()`, `adminCreateBlogPost()`, etc. |
| Settings | `api.adminGetAllSettings()`, `adminUpdateSetting()` |
| File Upload | `api.uploadFile(file, type)` |

## File Upload

Để upload file (ảnh sản phẩm, blog):

```typescript
const file = event.target.files[0];
const response = await api.uploadFile(file, 'products'); // hoặc 'blog', 'general'
const imageUrl = response.data.url;
```

Files được lưu tại:
- Products: `uploads/products/`
- Blog: `uploads/blog/`
- General: `uploads/general/`

## Lưu ý quan trọng

1. **API Response Format**: 
   - Supabase: `{ data, error }`
   - PHP API: `{ success, data, message }`

2. **Pagination**: API sử dụng `page` và `limit` thay vì `range()`

3. **Auth**: Token được lưu trong localStorage, tự động gửi trong header

4. **Error handling**: Sử dụng `ApiError` class

5. **CORS**: Đảm bảo domain frontend được thêm vào `ALLOWED_ORIGINS` trong config.php

## Troubleshooting

### Lỗi 500 Internal Server Error
- Kiểm tra PHP error log trong cPanel
- Đảm bảo PHP version >= 8.0
- Kiểm tra quyền file (755 cho thư mục, 644 cho file)

### Lỗi CORS
- Thêm domain vào `ALLOWED_ORIGINS` trong config.php
- Clear cache browser

### Lỗi Database Connection
- Kiểm tra thông tin DB trong config.php
- Đảm bảo user có đủ quyền trên database

### Lỗi 404 khi refresh
- Kiểm tra file `.htaccess` đã được upload vào `public_html/`
- Đảm bảo mod_rewrite được enable trên server

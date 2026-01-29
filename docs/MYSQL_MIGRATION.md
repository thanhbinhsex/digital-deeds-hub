# Hướng dẫn chuyển sang MySQL API

## Bước 1: Cập nhật file .env

Thêm biến môi trường API URL:

```env
VITE_API_URL=https://your-domain.com/api
```

## Bước 2: Chọn AuthContext phù hợp

### Nếu dùng MySQL (cPanel hosting):

Trong file `src/App.tsx`, thay đổi import:

```typescript
// Thay đổi từ:
import { AuthProvider } from '@/contexts/AuthContext';

// Thành:
import { AuthProvider } from '@/contexts/AuthContextApi';
```

### Nếu dùng Lovable Cloud (Supabase):

Giữ nguyên:
```typescript
import { AuthProvider } from '@/contexts/AuthContext';
```

## Bước 3: Cập nhật các component sử dụng Supabase trực tiếp

Các component hiện đang gọi `supabase.from(...)` cần được cập nhật để sử dụng `api` client:

```typescript
// Thay vì:
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('products').select('*');

// Dùng:
import { api } from '@/lib/api';
const response = await api.getProducts();
const data = response.data;
```

## Các API endpoints tương ứng:

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

## Lưu ý quan trọng

1. **API trả về format khác**: Supabase trả về `{ data, error }`, API trả về `{ success, data, message }`

2. **Pagination**: API sử dụng `page` và `limit` thay vì `range()`

3. **Auth**: Token được lưu trong localStorage, tự động gửi trong header

4. **Error handling**: Sử dụng `ApiError` class thay vì Supabase error

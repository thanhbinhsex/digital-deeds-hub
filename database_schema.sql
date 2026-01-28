-- =====================================================
-- VIETOOL DATABASE SCHEMA
-- Export date: 2026-01-28
-- Compatible with: PostgreSQL 14+
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.asset_type AS ENUM ('file', 'key', 'link');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.topup_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE public.wallet_tx_type AS ENUM ('credit', 'debit');

-- =====================================================
-- TABLES
-- =====================================================

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_vi TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_vi TEXT,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  description_vi TEXT,
  short_description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  original_price INTEGER,
  currency TEXT NOT NULL DEFAULT 'VND',
  status public.product_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  nhhtool_id TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product assets table
CREATE TABLE public.product_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.asset_type NOT NULL,
  storage_path TEXT,
  link_url TEXT,
  key_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  phone TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Wallets table
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type public.wallet_tx_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Topup requests table
CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  status public.topup_status NOT NULL DEFAULT 'pending',
  topup_code TEXT,
  reference TEXT,
  bank_transaction_id TEXT,
  proof_url TEXT,
  note TEXT,
  admin_id UUID,
  admin_note TEXT,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'VND',
  payment_method TEXT,
  coupon_id UUID,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  amount INTEGER NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Entitlements table
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_download_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, product_id)
);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  min_order_amount INTEGER DEFAULT 0,
  max_discount INTEGER,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Coupon usages table
CREATE TABLE public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_vi TEXT,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  content_vi TEXT,
  excerpt TEXT,
  excerpt_vi TEXT,
  image_url TEXT,
  author_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site settings table
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin audit logs table
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Categories
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Products
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_nhhtool_id ON public.products(nhhtool_id) WHERE nhhtool_id IS NOT NULL;

-- Product assets
CREATE INDEX idx_product_assets_product_id ON public.product_assets(product_id);

-- Profiles
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- User roles
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Wallets
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);

-- Wallet transactions
CREATE INDEX idx_wallet_tx_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_created_at ON public.wallet_transactions(created_at);

-- Topup requests
CREATE INDEX idx_topup_requests_user_id ON public.topup_requests(user_id);
CREATE INDEX idx_topup_requests_status ON public.topup_requests(status);
CREATE INDEX idx_topup_requests_topup_code ON public.topup_requests(topup_code);

-- Orders
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- Order items
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Payments
CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- Entitlements
CREATE INDEX idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX idx_entitlements_product_id ON public.entitlements(product_id);

-- Audit logs
CREATE INDEX idx_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate topup code
CREATE OR REPLACE FUNCTION public.generate_topup_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := 'NAP';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Set topup code trigger function
CREATE OR REPLACE FUNCTION public.set_topup_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.topup_code IS NULL THEN
    NEW.topup_code := generate_topup_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile with username
  INSERT INTO public.profiles (user_id, email, full_name, username)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'username'
  );
  
  -- Create user role (default: user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-generate topup code
CREATE TRIGGER tr_set_topup_code
  BEFORE INSERT ON public.topup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_topup_code();

-- Auto-update updated_at for products
CREATE TRIGGER tr_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at for categories
CREATE TRIGGER tr_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at for profiles
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at for orders
CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at for wallets
CREATE TRIGGER tr_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at for coupons
CREATE TRIGGER tr_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update updated_at for blog_posts
CREATE TRIGGER tr_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Handle new user registration (connect to auth.users)
-- NOTE: This trigger needs to be created on auth.users table
-- Run this in Supabase dashboard SQL editor:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default site settings
INSERT INTO public.site_settings (key, value, description) VALUES
  ('general', '{"site_name": "VieTool", "site_description": "Phần mềm bản quyền chất lượng", "contact_email": "", "contact_phone": ""}', 'Cài đặt chung'),
  ('payment', '{"bank_name": "", "bank_account": "", "bank_owner": "", "min_topup": 10000}', 'Cài đặt thanh toán'),
  ('notification', '{"telegram_enabled": false, "notify_on_order": true, "notify_on_topup": true}', 'Cài đặt thông báo'),
  ('contact', '{"telegram_url": "", "zalo_url": "", "facebook_url": ""}', 'Thông tin liên hệ'),
  ('banner', '{"title": "Welcome to VieTool", "title_vi": "Chào mừng đến với VieTool", "description": "", "description_vi": "", "button_text": "View Products", "button_text_vi": "Xem sản phẩm", "button_link": "/products"}', 'Banner trang chủ'),
  ('seo', '{"meta_title": "VieTool", "meta_description": "", "meta_keywords": "", "og_image": "", "favicon_url": ""}', 'Cài đặt SEO'),
  ('topup_promotion', '{"promotions": []}', 'Khuyến mãi nạp tiền')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- NOTES FOR CPANEL HOSTING
-- =====================================================
-- 
-- 1. This schema is designed for Supabase/PostgreSQL
-- 2. If using on cPanel with MySQL, you'll need to convert:
--    - UUID -> CHAR(36) or use UUID functions
--    - JSONB -> JSON or TEXT
--    - TIMESTAMP WITH TIME ZONE -> DATETIME
--    - ENUM types -> ENUM('value1', 'value2', ...)
--    - gen_random_uuid() -> UUID()
--    - now() -> NOW()
--
-- 3. RLS (Row Level Security) is Supabase-specific and won't work on cPanel
--    You'll need to implement security in your application layer
--
-- 4. The auth.uid() function is Supabase-specific
--    Replace with your own authentication system
--
-- 5. Edge functions need to be rewritten for your hosting environment
--
-- =====================================================

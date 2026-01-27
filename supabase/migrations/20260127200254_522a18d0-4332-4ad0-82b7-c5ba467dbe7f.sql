-- Add view_count to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- Create coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL,
  min_order_amount integer DEFAULT 0,
  max_discount integer,
  usage_limit integer,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create coupon usage tracking
CREATE TABLE public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at timestamp with time zone DEFAULT now()
);

-- Add coupon reference to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;

-- Create site_settings table for admin
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Anyone can view active coupons" ON public.coupons
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (is_admin());

-- RLS Policies for coupon_usages
CREATE POLICY "Users can view own usage" ON public.coupon_usages
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create usage" ON public.coupon_usages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage usages" ON public.coupon_usages
  FOR ALL USING (is_admin());

-- RLS Policies for site_settings
CREATE POLICY "Anyone can view settings" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.site_settings
  FOR ALL USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default site settings
INSERT INTO public.site_settings (key, value, description) VALUES
  ('general', '{"site_name": "MinMinTool", "site_description": "Phần mềm bản quyền chất lượng", "contact_email": "", "contact_phone": "", "facebook_url": "", "zalo_url": ""}', 'Cài đặt chung'),
  ('payment', '{"bank_name": "", "bank_account": "", "bank_owner": "", "min_topup": 10000}', 'Cài đặt thanh toán'),
  ('notification', '{"telegram_bot_token": "", "telegram_chat_id": "", "email_notifications": true}', 'Cài đặt thông báo')
ON CONFLICT (key) DO NOTHING;
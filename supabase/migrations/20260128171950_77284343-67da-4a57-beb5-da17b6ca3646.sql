-- CRITICAL SECURITY FIX: Restrict site_settings access
-- Problem: Bank account numbers and other sensitive info are publicly readable
-- Solution: Split into public and private settings access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;

-- Create policy for public-safe settings only (general, banner, seo - not payment/notification)
CREATE POLICY "Anyone can view public settings" 
ON public.site_settings 
FOR SELECT 
USING (
  key IN ('general', 'banner', 'seo', 'topup_promotion', 'contact')
);

-- Payment and notification settings only visible to authenticated admins (covered by existing admin policy)
-- Add nhhtool_id column to products table for mapping with nhhtool API
ALTER TABLE public.products 
ADD COLUMN nhhtool_id TEXT NULL;

-- Add index for faster lookups
CREATE INDEX idx_products_nhhtool_id ON public.products(nhhtool_id) WHERE nhhtool_id IS NOT NULL;

COMMENT ON COLUMN public.products.nhhtool_id IS 'Tool ID from nhhtool.id.vn API for direct purchase integration';
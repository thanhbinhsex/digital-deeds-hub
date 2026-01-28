-- Add unique topup code for bank matching
ALTER TABLE public.topup_requests 
ADD COLUMN IF NOT EXISTS topup_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT UNIQUE;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_topup_requests_topup_code ON public.topup_requests(topup_code);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status_pending ON public.topup_requests(status) WHERE status = 'pending';

-- Function to generate unique topup code
CREATE OR REPLACE FUNCTION public.generate_topup_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

-- Trigger to auto-generate topup code on insert
CREATE OR REPLACE FUNCTION public.set_topup_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.topup_code IS NULL THEN
    NEW.topup_code := generate_topup_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_topup_code ON public.topup_requests;
CREATE TRIGGER trigger_set_topup_code
  BEFORE INSERT ON public.topup_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_topup_code();
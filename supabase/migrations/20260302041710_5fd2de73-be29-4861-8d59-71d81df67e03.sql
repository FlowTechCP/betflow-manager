-- Add bank_name column to deposits so we know which bank to deduct from
ALTER TABLE public.deposits ADD COLUMN bank_name TEXT;
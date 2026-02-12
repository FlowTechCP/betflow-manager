
-- Create deposits table for tracking deposits to betting accounts
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all deposits"
  ON public.deposits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all deposits"
  ON public.deposits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Operators can manage their own deposits"
  ON public.deposits FOR ALL
  USING (created_by = get_current_profile_id());

CREATE POLICY "Operators can view their own deposits"
  ON public.deposits FOR SELECT
  USING (created_by = get_current_profile_id());

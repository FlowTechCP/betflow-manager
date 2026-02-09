
-- Create software_tools table
CREATE TABLE public.software_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.software_tools ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view software tools"
ON public.software_tools FOR SELECT
TO authenticated
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage software tools"
ON public.software_tools FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with existing options
INSERT INTO public.software_tools (name) VALUES
  ('Live'), ('Capper'), ('Trademate'), ('Rebel Betting'),
  ('Oddsmonkey'), ('BetBurger'), ('Manual'), ('Outros');

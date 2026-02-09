-- Add new transaction type enum values
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'comissao';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'despesa';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'imposto';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'recarga';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'ads';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'proxy';

-- Add is_recurring column to transactions
ALTER TABLE public.transactions ADD COLUMN is_recurring boolean NOT NULL DEFAULT false;
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- Create enum for account status
CREATE TYPE public.account_status AS ENUM ('em_uso', 'limitada', 'cevando', 'transferida');

-- Create enum for bet result
CREATE TYPE public.bet_result AS ENUM ('green', 'red', 'void', 'meio_green', 'meio_red');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('aporte', 'retirada', 'custo_operacional', 'compra_conta', 'correcao', 'recebido');

-- Create enum for market time
CREATE TYPE public.market_time AS ENUM ('jogo_todo', '1_tempo', '2_tempo');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for RBAC (separate from profiles)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create bookmakers table
CREATE TABLE public.bookmakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounts table
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bookmaker_id UUID NOT NULL REFERENCES public.bookmakers(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_nick TEXT NOT NULL,
    current_status account_status NOT NULL DEFAULT 'em_uso',
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    limitation_date DATE,
    vendor_name TEXT,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deposited NUMERIC(12,2) NOT NULL DEFAULT 0,
    initial_month_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_volume NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bets table (main operator view)
CREATE TABLE public.bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    bookmaker_id UUID NOT NULL REFERENCES public.bookmakers(id) ON DELETE CASCADE,
    stake NUMERIC(12,2) NOT NULL,
    result bet_result NOT NULL,
    profit NUMERIC(12,2) NOT NULL,
    odds NUMERIC(6,3) NOT NULL,
    market_time market_time NOT NULL DEFAULT 'jogo_todo',
    sport TEXT NOT NULL DEFAULT 'Futebol',
    software_tool TEXT NOT NULL DEFAULT 'Live',
    expected_value NUMERIC(12,2),
    teams TEXT,
    bet_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial transactions table (admin only)
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type transaction_type NOT NULL,
    category TEXT,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    bank_name TEXT,
    related_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    related_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank balances table
CREATE TABLE public.bank_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL UNIQUE,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_balances_updated_at
    BEFORE UPDATE ON public.bank_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.profiles p ON ur.user_id = p.id
        WHERE p.user_id = _user_id
          AND ur.role = _role
    )
$$;

-- Create function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_balances ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (user_id = public.get_current_profile_id());

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Bookmakers policies (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view bookmakers"
    ON public.bookmakers FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage bookmakers"
    ON public.bookmakers FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Accounts policies
CREATE POLICY "Operators can view their own accounts"
    ON public.accounts FOR SELECT
    USING (operator_id = public.get_current_profile_id());

CREATE POLICY "Admins can view all accounts"
    ON public.accounts FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can manage their own accounts"
    ON public.accounts FOR ALL
    USING (operator_id = public.get_current_profile_id());

CREATE POLICY "Admins can manage all accounts"
    ON public.accounts FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Bets policies
CREATE POLICY "Operators can view their own bets"
    ON public.bets FOR SELECT
    USING (operator_id = public.get_current_profile_id());

CREATE POLICY "Admins can view all bets"
    ON public.bets FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operators can manage their own bets"
    ON public.bets FOR ALL
    USING (operator_id = public.get_current_profile_id());

CREATE POLICY "Admins can manage all bets"
    ON public.bets FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Transactions policies (Admin only)
CREATE POLICY "Admins can view all transactions"
    ON public.transactions FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage transactions"
    ON public.transactions FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Bank balances policies (Admin only)
CREATE POLICY "Admins can view bank balances"
    ON public.bank_balances FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bank balances"
    ON public.bank_balances FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));

-- Insert default bookmakers
INSERT INTO public.bookmakers (name) VALUES
    ('Pinnacle'),
    ('Bet365'),
    ('Betfair'),
    ('Betano'),
    ('Sportingbet'),
    ('1xBet'),
    ('Betway'),
    ('888sport');

-- Insert default bank
INSERT INTO public.bank_balances (bank_name, current_balance) VALUES
    ('Inter', 0),
    ('Cevamento', 0),
    ('Bex', 0);
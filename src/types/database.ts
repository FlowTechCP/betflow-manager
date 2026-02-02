// Custom types for the betting ERP

export type AppRole = 'admin' | 'operator';
export type AccountStatus = 'em_uso' | 'limitada' | 'cevando' | 'transferida';
export type BetResult = 'green' | 'red' | 'void' | 'meio_green' | 'meio_red';
export type TransactionType = 'aporte' | 'retirada' | 'custo_operacional' | 'compra_conta' | 'correcao' | 'recebido';
export type MarketTime = 'jogo_todo' | '1_tempo' | '2_tempo';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Bookmaker {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  bookmaker_id: string;
  operator_id: string;
  login_nick: string;
  current_status: AccountStatus;
  purchase_price: number;
  acquisition_date: string;
  limitation_date: string | null;
  vendor_name: string | null;
  current_balance: number;
  pending_balance: number;
  total_deposited: number;
  initial_month_balance: number;
  total_volume: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  bookmaker?: Bookmaker;
  operator?: Profile;
}

export interface Bet {
  id: string;
  date: string;
  operator_id: string;
  account_id: string;
  bookmaker_id: string;
  stake: number;
  result: BetResult;
  profit: number;
  odds: number;
  market_time: MarketTime;
  sport: string;
  software_tool: string;
  expected_value: number | null;
  teams: string | null;
  bet_description: string | null;
  created_at: string;
  // Joined data
  account?: Account;
  bookmaker?: Bookmaker;
  operator?: Profile;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string | null;
  amount: number;
  description: string | null;
  bank_name: string | null;
  related_operator_id: string | null;
  related_account_id: string | null;
  created_at: string;
  // Joined data
  operator?: Profile;
  account?: Account;
}

export interface BankBalance {
  id: string;
  bank_name: string;
  current_balance: number;
  updated_at: string;
}

// Display helpers
export const accountStatusLabels: Record<AccountStatus, string> = {
  em_uso: 'Em Uso',
  limitada: 'Limitada',
  cevando: 'Cevando',
  transferida: 'Transferida',
};

export const betResultLabels: Record<BetResult, string> = {
  green: 'Green',
  red: 'Red',
  void: 'Void',
  meio_green: 'Meio Green',
  meio_red: 'Meio Red',
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  aporte: 'Aporte',
  retirada: 'Retirada',
  custo_operacional: 'Custo Operacional',
  compra_conta: 'Compra de Conta',
  correcao: 'Correção',
  recebido: 'Recebido',
};

export const marketTimeLabels: Record<MarketTime, string> = {
  jogo_todo: 'Jogo Todo',
  '1_tempo': '1º Tempo',
  '2_tempo': '2º Tempo',
};

export const sportOptions = [
  'Futebol',
  'Basquete',
  'Tênis',
  'Vôlei',
  'Hóquei',
  'Beisebol',
  'MMA',
  'eSports',
  'Outros',
];

export const softwareOptions = [
  'Live',
  'Capper',
  'Trademate',
  'Rebel Betting',
  'Oddsmonkey',
  'BetBurger',
  'Manual',
  'Outros',
];

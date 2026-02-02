import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ResultBadge } from '@/components/ui/result-badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Filter, Receipt } from 'lucide-react';
import { 
  Bet, 
  BetResult, 
  MarketTime, 
  betResultLabels, 
  marketTimeLabels,
  sportOptions,
  softwareOptions
} from '@/types/database';

export default function Apostas() {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  // Fetch accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['accounts-dropdown', profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select(`
          id,
          login_nick,
          bookmaker_id,
          bookmaker:bookmakers(id, name)
        `)
        .eq('current_status', 'em_uso');

      if (!isAdmin && profile?.id) {
        query = query.eq('operator_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch bets
  const { data: bets, isLoading } = useQuery({
    queryKey: ['bets', profile?.id, isAdmin, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('bets')
        .select(`
          *,
          bookmaker:bookmakers(name),
          account:accounts(login_nick)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!isAdmin && profile?.id) {
        query = query.eq('operator_id', profile.id);
      }

      if (dateFilter.start) {
        query = query.gte('date', dateFilter.start);
      }
      if (dateFilter.end) {
        query = query.lte('date', dateFilter.end);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    stake: '',
    result: 'green' as BetResult,
    odds: '',
    market_time: 'jogo_todo' as MarketTime,
    sport: 'Futebol',
    software_tool: 'Live',
    expected_value: '',
    teams: '',
    bet_description: '',
  });

  // Calculate profit based on result and odds
  const calculateProfit = (stake: number, odds: number, result: BetResult): number => {
    switch (result) {
      case 'green':
        return stake * (odds - 1);
      case 'red':
        return -stake;
      case 'void':
        return 0;
      case 'meio_green':
        return (stake * (odds - 1)) / 2;
      case 'meio_red':
        return -stake / 2;
      default:
        return 0;
    }
  };

  // Create bet mutation
  const createBet = useMutation({
    mutationFn: async () => {
      const selectedAccount = accounts?.find(a => a.id === form.account_id);
      if (!selectedAccount || !profile?.id) throw new Error('Dados inválidos');

      const stake = parseFloat(form.stake);
      const odds = parseFloat(form.odds);
      const profit = calculateProfit(stake, odds, form.result);
      const expectedValue = form.expected_value ? parseFloat(form.expected_value) : null;

      const { error } = await supabase.from('bets').insert({
        date: form.date,
        operator_id: profile.id,
        account_id: form.account_id,
        bookmaker_id: selectedAccount.bookmaker_id,
        stake,
        result: form.result,
        profit,
        odds,
        market_time: form.market_time,
        sport: form.sport,
        software_tool: form.software_tool,
        expected_value: expectedValue,
        teams: form.teams || null,
        bet_description: form.bet_description || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-bets'] });
      toast.success('Aposta registrada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao registrar aposta: ' + error.message);
    },
  });

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      account_id: '',
      stake: '',
      result: 'green',
      odds: '',
      market_time: 'jogo_todo',
      sport: 'Futebol',
      software_tool: 'Live',
      expected_value: '',
      teams: '',
      bet_description: '',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Apostas</h1>
            <p className="text-muted-foreground">Registro e histórico de apostas</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Aposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nova Aposta</DialogTitle>
              </DialogHeader>
              <form 
                onSubmit={(e) => { e.preventDefault(); createBet.mutate(); }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4"
              >
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select
                    value={form.account_id}
                    onValueChange={(value) => setForm({ ...form, account_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.login_nick} ({account.bookmaker?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor da Aposta (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.stake}
                    onChange={(e) => setForm({ ...form, stake: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>ODD</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.odds}
                    onChange={(e) => setForm({ ...form, odds: e.target.value })}
                    placeholder="1.850"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <Select
                    value={form.result}
                    onValueChange={(value) => setForm({ ...form, result: value as BetResult })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(betResultLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tempo</Label>
                  <Select
                    value={form.market_time}
                    onValueChange={(value) => setForm({ ...form, market_time: value as MarketTime })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(marketTimeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Esporte</Label>
                  <Select
                    value={form.sport}
                    onValueChange={(value) => setForm({ ...form, sport: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sportOptions.map((sport) => (
                        <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Software</Label>
                  <Select
                    value={form.software_tool}
                    onValueChange={(value) => setForm({ ...form, software_tool: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {softwareOptions.map((software) => (
                        <SelectItem key={software} value={software}>{software}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>EV Esperado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.expected_value}
                    onChange={(e) => setForm({ ...form, expected_value: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Times/Evento</Label>
                  <Input
                    value={form.teams}
                    onChange={(e) => setForm({ ...form, teams: e.target.value })}
                    placeholder="Ex: Palmeiras x Flamengo"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Descrição da Aposta</Label>
                  <Input
                    value={form.bet_description}
                    onChange={(e) => setForm({ ...form, bet_description: e.target.value })}
                    placeholder="Ex: Casa HA -0,5"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createBet.isPending}>
                    {createBet.isPending ? 'Salvando...' : 'Salvar Aposta'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                  className="w-40"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateFilter({ start: '', end: '' })}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Histórico de Apostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : bets && bets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Casa</th>
                      <th>Conta</th>
                      <th>Aposta</th>
                      <th>Resultado</th>
                      <th>Lucro</th>
                      <th>Tempo</th>
                      <th>ODD</th>
                      <th>Software</th>
                      <th>Esporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((bet: any) => (
                      <tr key={bet.id}>
                        <td className="mono-number">{formatDate(bet.date)}</td>
                        <td>{bet.bookmaker?.name}</td>
                        <td>{bet.account?.login_nick}</td>
                        <td className="mono-number">{formatCurrency(Number(bet.stake))}</td>
                        <td>
                          <ResultBadge result={bet.result as BetResult} />
                        </td>
                        <td className={`mono-number font-medium ${Number(bet.profit) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(Number(bet.profit))}
                        </td>
                        <td className="text-xs">{marketTimeLabels[bet.market_time as MarketTime]}</td>
                        <td className="mono-number">{Number(bet.odds).toFixed(3)}</td>
                        <td className="text-xs">{bet.software_tool}</td>
                        <td className="text-xs">{bet.sport}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma aposta encontrada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

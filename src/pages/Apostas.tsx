import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ResultBadge } from '@/components/ui/result-badge';
import { BetFormDialog, BetFormData } from '@/components/apostas/BetFormDialog';
import { DeleteBetDialog } from '@/components/apostas/DeleteBetDialog';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Filter, Receipt, Pencil, Trash2 } from 'lucide-react';
import { BetResult, MarketTime, marketTimeLabels } from '@/types/database';

const calculateProfit = (stake: number, odds: number, result: BetResult): number => {
  switch (result) {
    case 'green': return stake * (odds - 1);
    case 'red': return -stake;
    case 'meio_green': return (stake * (odds - 1)) / 2;
    case 'meio_red': return -stake / 2;
    default: return 0;
  }
};

export default function Apostas() {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBet, setEditingBet] = useState<any>(null);
  const [deletingBetId, setDeletingBetId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const { data: accounts } = useQuery({
    queryKey: ['accounts-dropdown', profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('id, login_nick, bookmaker_id, bookmaker:bookmakers(id, name)')
        .eq('current_status', 'em_uso');
      if (!isAdmin && profile?.id) query = query.eq('operator_id', profile.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: bets, isLoading } = useQuery({
    queryKey: ['bets', profile?.id, isAdmin, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('bets')
        .select('*, bookmaker:bookmakers(name), account:accounts(login_nick)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      // Note: pendentes will be sorted to top in the UI
      if (!isAdmin && profile?.id) query = query.eq('operator_id', profile.id);
      if (dateFilter.start) query = query.gte('date', dateFilter.start);
      if (dateFilter.end) query = query.lte('date', dateFilter.end);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const invalidateBets = () => {
    queryClient.invalidateQueries({ queryKey: ['bets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-bets'] });
  };

  const createBet = useMutation({
    mutationFn: async (form: BetFormData) => {
      const selectedAccount = accounts?.find(a => a.id === form.account_id);
      if (!selectedAccount || !profile?.id) throw new Error('Dados inválidos');
      const stake = parseFloat(form.stake);
      const odds = parseFloat(form.odds);
      const { error } = await supabase.from('bets').insert({
        date: form.date, operator_id: profile.id, account_id: form.account_id,
        bookmaker_id: selectedAccount.bookmaker_id, stake, result: form.result,
        profit: calculateProfit(stake, odds, form.result), odds,
        market_time: form.market_time, sport: form.sport, software_tool: form.software_tool,
        expected_value: form.expected_value ? parseFloat(form.expected_value) : null,
        teams: form.teams || null, bet_description: form.bet_description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidateBets(); toast.success('Aposta registrada!'); setIsCreateOpen(false); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const updateBet = useMutation({
    mutationFn: async (form: BetFormData & { id: string }) => {
      const selectedAccount = accounts?.find(a => a.id === form.account_id);
      if (!selectedAccount) throw new Error('Conta inválida');
      const stake = parseFloat(form.stake);
      const odds = parseFloat(form.odds);
      const { error } = await supabase.from('bets').update({
        date: form.date, account_id: form.account_id,
        bookmaker_id: selectedAccount.bookmaker_id, stake, result: form.result,
        profit: calculateProfit(stake, odds, form.result), odds,
        market_time: form.market_time, sport: form.sport, software_tool: form.software_tool,
        expected_value: form.expected_value ? parseFloat(form.expected_value) : null,
        teams: form.teams || null, bet_description: form.bet_description || null,
      }).eq('id', form.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateBets(); toast.success('Aposta atualizada!'); setEditingBet(null); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const deleteBet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateBets(); toast.success('Aposta excluída!'); setDeletingBetId(null); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const betToFormData = (bet: any): BetFormData => ({
    date: bet.date,
    account_id: bet.account_id,
    stake: String(bet.stake),
    result: bet.result,
    odds: String(bet.odds),
    market_time: bet.market_time,
    sport: bet.sport,
    software_tool: bet.software_tool,
    expected_value: bet.expected_value != null ? String(bet.expected_value) : '',
    teams: bet.teams || '',
    bet_description: bet.bet_description || '',
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Apostas</h1>
            <p className="text-muted-foreground">Registro e histórico de apostas</p>
          </div>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Aposta
          </Button>
        </div>

        {/* Create Dialog */}
        <BetFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={(form) => createBet.mutate(form)}
          isPending={createBet.isPending}
          accounts={accounts as any}
          title="Registrar Nova Aposta"
          submitLabel="Salvar Aposta"
        />

        {/* Edit Dialog */}
        <BetFormDialog
          open={!!editingBet}
          onOpenChange={(open) => { if (!open) setEditingBet(null); }}
          onSubmit={(form) => updateBet.mutate({ ...form, id: editingBet?.id })}
          isPending={updateBet.isPending}
          accounts={accounts as any}
          initialData={editingBet ? betToFormData(editingBet) : null}
          title="Editar Aposta"
          submitLabel="Atualizar Aposta"
        />

        {/* Delete Dialog */}
        <DeleteBetDialog
          open={!!deletingBetId}
          onOpenChange={(open) => { if (!open) setDeletingBetId(null); }}
          onConfirm={() => deletingBetId && deleteBet.mutate(deletingBetId)}
          isPending={deleteBet.isPending}
        />

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
                <Input type="date" value={dateFilter.start} onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} className="w-40" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" value={dateFilter.end} onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} className="w-40" />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={() => setDateFilter({ start: '', end: '' })}>Limpar</Button>
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
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : bets && bets.length > 0 ? (() => {
              // Sort: pendentes first, then by date desc
              const sortedBets = [...bets].sort((a, b) => {
                const aP = a.result === 'pendente' ? 0 : 1;
                const bP = b.result === 'pendente' ? 0 : 1;
                if (aP !== bP) return aP - bP;
                return 0; // keep original order for same group
              });
              return (
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
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBets.map((bet: any) => (
                      <tr key={bet.id}>
                        <td className="mono-number">{formatDate(bet.date)}</td>
                        <td>{bet.bookmaker?.name}</td>
                        <td>{bet.account?.login_nick}</td>
                        <td className="mono-number">{formatCurrency(Number(bet.stake))}</td>
                        <td><ResultBadge result={bet.result as BetResult} /></td>
                        <td className={`mono-number font-medium ${Number(bet.profit) >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(Number(bet.profit))}
                        </td>
                        <td className="text-xs">{marketTimeLabels[bet.market_time as MarketTime]}</td>
                        <td className="mono-number">{Number(bet.odds).toFixed(3)}</td>
                        <td className="text-xs">{bet.software_tool}</td>
                        <td className="text-xs">{bet.sport}</td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBet(bet)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingBetId(bet.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })() : (
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

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
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, ArrowDownToLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Depositos() {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    amount: '',
    description: '',
  });

  // Fetch accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['accounts-dropdown-deposits', profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('id, login_nick, bookmaker:bookmakers(name)')
        .eq('current_status', 'em_uso');
      if (!isAdmin && profile?.id) query = query.eq('operator_id', profile.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch deposits
  const { data: deposits, isLoading } = useQuery({
    queryKey: ['deposits', profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('deposits')
        .select('*, account:accounts(login_nick, bookmaker:bookmakers(name))')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (!isAdmin && profile?.id) query = query.eq('created_by', profile.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const createDeposit = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não encontrado');
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) throw new Error('Valor inválido');

      // Insert deposit
      const { error: depositError } = await supabase.from('deposits').insert({
        date: form.date,
        account_id: form.account_id,
        amount,
        description: form.description || null,
        created_by: profile.id,
      });
      if (depositError) throw depositError;

      // Update account balance
      const { data: account } = await supabase
        .from('accounts')
        .select('current_balance, total_deposited')
        .eq('id', form.account_id)
        .single();

      if (account) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            current_balance: Number(account.current_balance) + amount,
            total_deposited: Number(account.total_deposited) + amount,
          })
          .eq('id', form.account_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Depósito registrado!');
      setIsDialogOpen(false);
      setForm({ date: new Date().toISOString().split('T')[0], account_id: '', amount: '', description: '' });
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const totalDeposited = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Depósitos</h1>
            <p className="text-muted-foreground">Registre depósitos nas contas de apostas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Depósito
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Depósito</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createDeposit.mutate(); }} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.login_nick} — {acc.bookmaker?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Observações" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createDeposit.isPending}>
                    {createDeposit.isPending ? 'Salvando...' : 'Depositar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary */}
        <Card className="stat-card-primary">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Depositado</p>
            <p className="text-2xl font-bold mono-number">{formatCurrency(totalDeposited)}</p>
          </CardContent>
        </Card>

        {/* Deposits Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              Histórico de Depósitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : deposits && deposits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Conta</th>
                      <th>Casa</th>
                      <th>Valor</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d: any) => (
                      <tr key={d.id}>
                        <td className="mono-number">{formatDate(d.date)}</td>
                        <td>{d.account?.login_nick}</td>
                        <td>{d.account?.bookmaker?.name}</td>
                        <td className="mono-number font-medium text-success">{formatCurrency(Number(d.amount))}</td>
                        <td className="text-sm text-muted-foreground">{d.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhum depósito registrado.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

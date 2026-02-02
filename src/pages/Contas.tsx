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
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, CreditCard, AlertTriangle } from 'lucide-react';
import { Account, AccountStatus, accountStatusLabels } from '@/types/database';
import { cn } from '@/lib/utils';

export default function Contas() {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Fetch bookmakers
  const { data: bookmakers } = useQuery({
    queryKey: ['bookmakers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookmakers')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts', profile?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select(`
          *,
          bookmaker:bookmakers(name),
          operator:profiles(name)
        `)
        .order('current_status')
        .order('login_nick');

      if (!isAdmin && profile?.id) {
        query = query.eq('operator_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Account & { bookmaker: { name: string }, operator: { name: string } })[];
    },
    enabled: !!profile?.id,
  });

  // Form state
  const [form, setForm] = useState({
    bookmaker_id: '',
    login_nick: '',
    current_status: 'em_uso' as AccountStatus,
    purchase_price: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    limitation_date: '',
    vendor_name: '',
    current_balance: '0',
    notes: '',
  });

  // Create/Update account mutation
  const saveAccount = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Usuário não encontrado');

      const accountData = {
        bookmaker_id: form.bookmaker_id,
        operator_id: profile.id,
        login_nick: form.login_nick,
        current_status: form.current_status,
        purchase_price: parseFloat(form.purchase_price) || 0,
        acquisition_date: form.acquisition_date,
        limitation_date: form.current_status === 'limitada' && form.limitation_date ? form.limitation_date : null,
        vendor_name: form.vendor_name || null,
        current_balance: parseFloat(form.current_balance) || 0,
        notes: form.notes || null,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert(accountData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(editingAccount ? 'Conta atualizada!' : 'Conta criada com sucesso!');
      setIsDialogOpen(false);
      setEditingAccount(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao salvar conta: ' + error.message);
    },
  });

  const resetForm = () => {
    setForm({
      bookmaker_id: '',
      login_nick: '',
      current_status: 'em_uso',
      purchase_price: '',
      acquisition_date: new Date().toISOString().split('T')[0],
      limitation_date: '',
      vendor_name: '',
      current_balance: '0',
      notes: '',
    });
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setForm({
      bookmaker_id: account.bookmaker_id,
      login_nick: account.login_nick,
      current_status: account.current_status,
      purchase_price: account.purchase_price.toString(),
      acquisition_date: account.acquisition_date,
      limitation_date: account.limitation_date || '',
      vendor_name: account.vendor_name || '',
      current_balance: account.current_balance.toString(),
      notes: account.notes || '',
    });
    setIsDialogOpen(true);
  };

  // Group accounts by status
  const groupedAccounts = accounts?.reduce((acc, account) => {
    const status = account.current_status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(account);
    return acc;
  }, {} as Record<AccountStatus, typeof accounts>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Contas</h1>
            <p className="text-muted-foreground">Contas de casas de apostas</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAccount(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Editar Conta' : 'Adicionar Nova Conta'}</DialogTitle>
              </DialogHeader>
              <form 
                onSubmit={(e) => { e.preventDefault(); saveAccount.mutate(); }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4"
              >
                <div className="space-y-2">
                  <Label>Casa de Apostas</Label>
                  <Select
                    value={form.bookmaker_id}
                    onValueChange={(value) => setForm({ ...form, bookmaker_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {bookmakers?.map((bm) => (
                        <SelectItem key={bm.id} value={bm.id}>{bm.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nick/Login</Label>
                  <Input
                    value={form.login_nick}
                    onChange={(e) => setForm({ ...form, login_nick: e.target.value })}
                    placeholder="Nick da conta"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.current_status}
                    onValueChange={(value) => setForm({ ...form, current_status: value as AccountStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accountStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.current_status === 'limitada' && (
                  <div className="space-y-2">
                    <Label>Data da Limitação</Label>
                    <Input
                      type="date"
                      value={form.limitation_date}
                      onChange={(e) => setForm({ ...form, limitation_date: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Preço de Compra (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.purchase_price}
                    onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Aquisição</Label>
                  <Input
                    type="date"
                    value={form.acquisition_date}
                    onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vendedor</Label>
                  <Input
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    placeholder="Nome do vendedor"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Saldo Atual (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.current_balance}
                    onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saveAccount.isPending}>
                    {saveAccount.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card-success">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Em Uso</p>
              <p className="text-2xl font-bold">{groupedAccounts?.em_uso?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="stat-card-danger">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Limitadas</p>
              <p className="text-2xl font-bold">{groupedAccounts?.limitada?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="stat-card-primary">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Cevando</p>
              <p className="text-2xl font-bold">{groupedAccounts?.cevando?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{accounts?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Lista de Contas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : accounts && accounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Conta</th>
                      <th>Casa</th>
                      {isAdmin && <th>Operador</th>}
                      <th>Status</th>
                      <th>Saldo Atual</th>
                      <th>Custo</th>
                      <th>Aquisição</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr 
                        key={account.id}
                        className={cn(
                          account.current_status === 'limitada' && 'row-limited'
                        )}
                      >
                        <td className="font-medium">{account.login_nick}</td>
                        <td>{account.bookmaker?.name}</td>
                        {isAdmin && <td>{account.operator?.name}</td>}
                        <td>
                          <StatusBadge status={account.current_status} />
                        </td>
                        <td className="mono-number">{formatCurrency(Number(account.current_balance))}</td>
                        <td className="mono-number">{formatCurrency(Number(account.purchase_price))}</td>
                        <td className="mono-number">{formatDate(account.acquisition_date)}</td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(account)}
                          >
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta encontrada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

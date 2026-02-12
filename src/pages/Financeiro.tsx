import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getMonthYear, getMonthYearKey } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, BarChart3, Landmark } from 'lucide-react';
import { TransactionType, transactionTypeLabels, Transaction } from '@/types/database';
import { Navigate } from 'react-router-dom';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';

export default function Financeiro() {
  const { isAdmin, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getMonthYearKey(new Date().toISOString()));

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          operator:profiles(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as (Transaction & { operator: { name: string } | null })[];
    },
  });

  // Fetch bank balances
  const { data: bankBalances } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*')
        .order('bank_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch bets for DRE (profit calculation)
  const { data: betsProfit } = useQuery({
    queryKey: ['bets-profit', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('bets')
        .select('profit')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return data.reduce((sum, bet) => sum + Number(bet.profit), 0);
    },
  });

  // Fetch total deposits for Caixa
  const { data: totalDeposits } = useQuery({
    queryKey: ['total-deposits', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('deposits')
        .select('amount')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return data.reduce((sum, d) => sum + Number(d.amount), 0);
    },
  });

  // Fetch limited accounts for DRE (COGS - cost of accounts)
  const { data: limitedAccountsCost } = useQuery({
    queryKey: ['limited-accounts-cost', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('accounts')
        .select('purchase_price')
        .eq('current_status', 'limitada')
        .gte('limitation_date', startDate)
        .lte('limitation_date', endDate);

      if (error) throw error;
      return data.reduce((sum, acc) => sum + Number(acc.purchase_price), 0);
    },
  });

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'aporte' as TransactionType,
    category: '',
    amount: '',
    description: '',
    bank_name: 'Inter',
    is_recurring: false,
  });

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('transactions').insert({
        date: form.date,
        type: form.type,
        category: form.category || null,
        amount: parseFloat(form.amount),
        description: form.description || null,
        bank_name: form.bank_name,
        is_recurring: form.is_recurring,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação registrada!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao registrar transação: ' + error.message);
    },
  });

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      type: 'aporte',
      category: '',
      amount: '',
      description: '',
      bank_name: 'Inter',
      is_recurring: false,
    });
  };

  // Calculate DRE
  const revenue = betsProfit || 0;
  const variableCosts = limitedAccountsCost || 0;
  const fixedCosts = transactions?.filter(t => t.is_recurring)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
  const investments = transactions?.filter(t => t.type === 'aporte')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const withdrawals = transactions?.filter(t => t.type === 'retirada')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;
  const netProfit = revenue - variableCosts - fixedCosts;

  const dreCalculations = { revenue, variableCosts, fixedCosts, investments, withdrawals, netProfit };

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Generate month options
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    monthOptions.push({
      value: getMonthYearKey(date.toISOString()),
      label: getMonthYear(date.toISOString()),
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground">Controle financeiro e DRE</p>
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Transação</DialogTitle>
                </DialogHeader>
                <form 
                  onSubmit={(e) => { e.preventDefault(); createTransaction.mutate(); }}
                  className="space-y-4 py-4"
                >
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>Tipo</Label>
                      <Select
                        value={form.type}
                        onValueChange={(value) => setForm({ ...form, type: value as TransactionType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(transactionTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Select
                        value={form.bank_name}
                        onValueChange={(value) => setForm({ ...form, bank_name: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bankBalances?.map((bank) => (
                            <SelectItem key={bank.id} value={bank.bank_name}>{bank.bank_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="Ex: Salários, Software, Proxy"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <Label htmlFor="is_recurring" className="cursor-pointer">Recorrente</Label>
                    <Switch
                      id="is_recurring"
                      checked={form.is_recurring}
                      onCheckedChange={(checked) => setForm({ ...form, is_recurring: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Observações"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createTransaction.isPending}>
                      {createTransaction.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="dre" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="caixa">Caixa</TabsTrigger>
            <TabsTrigger value="transactions">Movimentações</TabsTrigger>
            <TabsTrigger value="banks">Bancos</TabsTrigger>
          </TabsList>

          {/* DRE Tab */}
          <TabsContent value="dre" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Receita (Lucro Apostas)"
                value={formatCurrency(dreCalculations.revenue)}
                icon={TrendingUp}
                variant={dreCalculations.revenue >= 0 ? 'success' : 'danger'}
              />
              <StatCard
                title="Custo Variável (Contas)"
                value={formatCurrency(dreCalculations.variableCosts)}
                icon={TrendingDown}
                variant="danger"
                subtitle="Contas limitadas no período"
              />
              <StatCard
                title="Custos Fixos"
                value={formatCurrency(dreCalculations.fixedCosts)}
                icon={PiggyBank}
                variant="danger"
                subtitle="Salários, software, etc"
              />
            </div>

            <Card className={cn(
              "border-2",
              dreCalculations.netProfit >= 0 ? "border-success/50" : "border-destructive/50"
            )}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Demonstrativo de Resultado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span>Receita Bruta (Lucro de Apostas)</span>
                    <span className="mono-number font-medium text-success">{formatCurrency(dreCalculations.revenue)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span>(-) Custo Variável (Contas Limitadas)</span>
                    <span className="mono-number text-destructive">-{formatCurrency(dreCalculations.variableCosts)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span>(-) Custos Fixos Operacionais</span>
                    <span className="mono-number text-destructive">-{formatCurrency(dreCalculations.fixedCosts)}</span>
                  </div>
                  <div className="flex justify-between py-3 bg-secondary/50 rounded-lg px-4 mt-4">
                    <span className="font-bold text-lg">= Lucro Líquido</span>
                    <span className={cn(
                      "mono-number font-bold text-lg",
                      dreCalculations.netProfit >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(dreCalculations.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-dashed border-border mt-4">
                    <span className="text-muted-foreground">Aportes (Não é receita)</span>
                    <span className="mono-number text-primary">{formatCurrency(dreCalculations.investments)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Retiradas</span>
                    <span className="mono-number text-warning">{formatCurrency(dreCalculations.withdrawals)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Caixa Tab */}
          <TabsContent value="caixa" className="space-y-6">
            {(() => {
              const aportes = transactions?.filter(t => t.type === 'aporte').reduce((s, t) => s + Number(t.amount), 0) || 0;
              const retiradas = transactions?.filter(t => t.type === 'retirada').reduce((s, t) => s + Math.abs(Number(t.amount)), 0) || 0;
              const despesas = transactions?.filter(t => !['aporte', 'retirada'].includes(t.type)).reduce((s, t) => s + Math.abs(Number(t.amount)), 0) || 0;
              const depositsMonth = totalDeposits || 0;
              const lucro = betsProfit || 0;
              const saldo = aportes + lucro - retiradas - despesas;

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard title="Aportes" value={formatCurrency(aportes)} icon={TrendingUp} variant="success" />
                    <StatCard title="Lucro das Apostas" value={formatCurrency(lucro)} icon={TrendingUp} variant={lucro >= 0 ? 'success' : 'danger'} />
                    <StatCard title="Depósitos em Contas" value={formatCurrency(depositsMonth)} icon={PiggyBank} variant="primary" subtitle="Depositado em contas de apostas" />
                    <StatCard title="Retiradas" value={formatCurrency(retiradas)} icon={TrendingDown} variant="danger" />
                    <StatCard title="Despesas" value={formatCurrency(despesas)} icon={TrendingDown} variant="danger" subtitle="Excluindo aportes e retiradas" />
                  </div>

                  <Card className={cn("border-2", saldo >= 0 ? "border-success/50" : "border-destructive/50")}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5" />
                        Fluxo de Caixa do Mês
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-border">
                          <span>Aportes</span>
                          <span className="mono-number text-success">+{formatCurrency(aportes)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                          <span>Lucro de Apostas</span>
                          <span className={cn("mono-number", lucro >= 0 ? "text-success" : "text-destructive")}>{formatCurrency(lucro)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                          <span>(-) Retiradas</span>
                          <span className="mono-number text-destructive">-{formatCurrency(retiradas)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                          <span>(-) Despesas Operacionais</span>
                          <span className="mono-number text-destructive">-{formatCurrency(despesas)}</span>
                        </div>
                        <div className="flex justify-between py-3 bg-secondary/50 rounded-lg px-4 mt-4">
                          <span className="font-bold text-lg">= Saldo do Período</span>
                          <span className={cn("mono-number font-bold text-lg", saldo >= 0 ? "text-success" : "text-destructive")}>
                            {formatCurrency(saldo)}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-t border-dashed border-border mt-4">
                          <span className="text-muted-foreground">Depósitos em Contas (redistribuição)</span>
                          <span className="mono-number text-primary">{formatCurrency(depositsMonth)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Banco</th>
                          <th>Tipo</th>
                          <th>Categoria</th>
                          <th>Valor</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id}>
                            <td className="mono-number">{formatDate(t.date)}</td>
                            <td>{t.bank_name}</td>
                            <td>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                t.type === 'aporte' && "bg-primary/20 text-primary",
                                t.type === 'retirada' && "bg-warning/20 text-warning",
                                t.type === 'custo_operacional' && "bg-destructive/20 text-destructive",
                                t.type === 'correcao' && "bg-muted text-muted-foreground",
                              )}>
                                {transactionTypeLabels[t.type]}
                              </span>
                            </td>
                            <td className="text-sm">{t.category || '-'}</td>
                            <td className={cn(
                              "mono-number font-medium",
                              Number(t.amount) >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {formatCurrency(Number(t.amount))}
                            </td>
                            <td className="text-sm text-muted-foreground max-w-[200px] truncate">{t.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma transação encontrada neste período.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banks Tab */}
          <TabsContent value="banks">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bankBalances?.map((bank) => (
                <Card key={bank.id} className="stat-card-primary">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{bank.bank_name}</p>
                    <p className="text-2xl font-bold mono-number">{formatCurrency(Number(bank.current_balance))}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atualizado: {formatDate(bank.updated_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

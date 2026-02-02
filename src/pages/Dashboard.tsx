import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResultBadge } from '@/components/ui/result-badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Activity,
  ArrowUpRight,
  ArrowDownRight 
} from 'lucide-react';
import { Bet, BetResult } from '@/types/database';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();

  // Fetch bets for the current month
  const { data: bets, isLoading: betsLoading } = useQuery({
    queryKey: ['dashboard-bets', profile?.id, isAdmin],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      let query = supabase
        .from('bets')
        .select(`
          *,
          bookmaker:bookmakers(name),
          account:accounts(login_nick)
        `)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!isAdmin && profile?.id) {
        query = query.eq('operator_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Bet & { bookmaker: { name: string }, account: { login_nick: string } })[];
    },
    enabled: !!profile?.id,
  });

  // Calculate stats
  const stats = bets ? {
    totalVolume: bets.reduce((sum, bet) => sum + Number(bet.stake), 0),
    totalProfit: bets.reduce((sum, bet) => sum + Number(bet.profit), 0),
    totalBets: bets.length,
    winRate: bets.length > 0 
      ? (bets.filter(b => b.result === 'green' || b.result === 'meio_green').length / bets.length) * 100 
      : 0,
    expectedValue: bets.reduce((sum, bet) => sum + (Number(bet.expected_value) || 0), 0),
  } : null;

  const roi = stats && stats.totalVolume > 0 
    ? (stats.totalProfit / stats.totalVolume) * 100 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Visão geral da operação' : `Bem-vindo, ${profile?.name}`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {betsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Volume do Mês"
                value={formatCurrency(stats?.totalVolume || 0)}
                icon={Activity}
                variant="primary"
              />
              <StatCard
                title="Lucro do Mês"
                value={formatCurrency(stats?.totalProfit || 0)}
                icon={stats && stats.totalProfit >= 0 ? ArrowUpRight : ArrowDownRight}
                variant={stats && stats.totalProfit >= 0 ? 'success' : 'danger'}
              />
              <StatCard
                title="ROI"
                value={formatPercent(roi)}
                icon={TrendingUp}
                variant={roi >= 0 ? 'success' : 'danger'}
                subtitle={`${stats?.totalBets || 0} apostas`}
              />
              <StatCard
                title="EV Esperado"
                value={formatCurrency(stats?.expectedValue || 0)}
                icon={Target}
                variant="primary"
                subtitle={`Win Rate: ${(stats?.winRate || 0).toFixed(1)}%`}
              />
            </>
          )}
        </div>

        {/* Recent Bets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Apostas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {betsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
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
                      <th>ODD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.slice(0, 10).map((bet) => (
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
                        <td className="mono-number">{Number(bet.odds).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma aposta encontrada este mês.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

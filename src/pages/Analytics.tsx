import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency, formatPercent, getMonthYearKey } from '@/lib/format';
import { TrendingUp, Activity, Target, Users, BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Analytics() {
  const { isAdmin } = useAuth();

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentMonth = getMonthYearKey(new Date().toISOString());
  const [year, month] = currentMonth.split('-');
  const startDate = `${year}-${month}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

  // Fetch all bets with operator info
  const { data: bets, isLoading: betsLoading } = useQuery({
    queryKey: ['analytics-bets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bets')
        .select(`
          *,
          operator:profiles(id, name)
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return data;
    },
  });

  // Calculate stats by operator
  const operatorStats = bets?.reduce((acc, bet) => {
    const operatorId = bet.operator?.id;
    const operatorName = bet.operator?.name || 'Desconhecido';
    
    if (!acc[operatorId]) {
      acc[operatorId] = {
        name: operatorName,
        volume: 0,
        profit: 0,
        betCount: 0,
        expectedValue: 0,
        wins: 0,
      };
    }
    
    acc[operatorId].volume += Number(bet.stake);
    acc[operatorId].profit += Number(bet.profit);
    acc[operatorId].betCount += 1;
    acc[operatorId].expectedValue += Number(bet.expected_value) || 0;
    if (bet.result === 'green' || bet.result === 'meio_green') {
      acc[operatorId].wins += 1;
    }
    
    return acc;
  }, {} as Record<string, {
    name: string;
    volume: number;
    profit: number;
    betCount: number;
    expectedValue: number;
    wins: number;
  }>);

  const operatorStatsArray = Object.values(operatorStats || {}).map(op => ({
    ...op,
    roi: op.volume > 0 ? (op.profit / op.volume) * 100 : 0,
    winRate: op.betCount > 0 ? (op.wins / op.betCount) * 100 : 0,
  }));

  // Global stats
  const globalStats = {
    totalVolume: bets?.reduce((sum, bet) => sum + Number(bet.stake), 0) || 0,
    totalProfit: bets?.reduce((sum, bet) => sum + Number(bet.profit), 0) || 0,
    totalBets: bets?.length || 0,
    totalEV: bets?.reduce((sum, bet) => sum + (Number(bet.expected_value) || 0), 0) || 0,
    operatorCount: Object.keys(operatorStats || {}).length,
  };
  
  const globalROI = globalStats.totalVolume > 0 
    ? (globalStats.totalProfit / globalStats.totalVolume) * 100 
    : 0;

  // Stats by sport
  const sportStats = bets?.reduce((acc, bet) => {
    if (!acc[bet.sport]) {
      acc[bet.sport] = { volume: 0, profit: 0, count: 0 };
    }
    acc[bet.sport].volume += Number(bet.stake);
    acc[bet.sport].profit += Number(bet.profit);
    acc[bet.sport].count += 1;
    return acc;
  }, {} as Record<string, { volume: number; profit: number; count: number }>);

  // Stats by bookmaker
  const bookmakerStats = bets?.reduce((acc, bet) => {
    const bkId = bet.bookmaker_id;
    if (!acc[bkId]) {
      acc[bkId] = { volume: 0, profit: 0, count: 0 };
    }
    acc[bkId].volume += Number(bet.stake);
    acc[bkId].profit += Number(bet.profit);
    acc[bkId].count += 1;
    return acc;
  }, {} as Record<string, { volume: number; profit: number; count: number }>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Visão geral de performance da operação</p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {betsLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-[100px]" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Volume Total"
                value={formatCurrency(globalStats.totalVolume)}
                icon={Activity}
                variant="primary"
              />
              <StatCard
                title="Lucro Total"
                value={formatCurrency(globalStats.totalProfit)}
                icon={globalStats.totalProfit >= 0 ? TrendingUp : TrendingUp}
                variant={globalStats.totalProfit >= 0 ? 'success' : 'danger'}
              />
              <StatCard
                title="ROI"
                value={formatPercent(globalROI)}
                icon={BarChart3}
                variant={globalROI >= 0 ? 'success' : 'danger'}
              />
              <StatCard
                title="EV Esperado"
                value={formatCurrency(globalStats.totalEV)}
                icon={Target}
                variant="primary"
              />
              <StatCard
                title="Total Apostas"
                value={globalStats.totalBets.toString()}
                icon={Users}
                subtitle={`${globalStats.operatorCount} operadores`}
              />
            </>
          )}
        </div>

        {/* Operator Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Performance por Operador
            </CardTitle>
          </CardHeader>
          <CardContent>
            {betsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : operatorStatsArray.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Operador</th>
                      <th>Volume</th>
                      <th>Lucro</th>
                      <th>ROI</th>
                      <th>Win Rate</th>
                      <th>EV Esperado</th>
                      <th>Apostas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorStatsArray.sort((a, b) => b.profit - a.profit).map((op, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{op.name}</td>
                        <td className="mono-number">{formatCurrency(op.volume)}</td>
                        <td className={cn(
                          "mono-number font-medium",
                          op.profit >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatCurrency(op.profit)}
                        </td>
                        <td className={cn(
                          "mono-number",
                          op.roi >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {formatPercent(op.roi)}
                        </td>
                        <td className="mono-number">{op.winRate.toFixed(1)}%</td>
                        <td className="mono-number text-primary">{formatCurrency(op.expectedValue)}</td>
                        <td className="mono-number">{op.betCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado encontrado para este período.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sport Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance por Esporte</CardTitle>
            </CardHeader>
            <CardContent>
              {sportStats && Object.keys(sportStats).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(sportStats)
                    .sort((a, b) => b[1].profit - a[1].profit)
                    .map(([sport, stats]) => {
                      const roi = stats.volume > 0 ? (stats.profit / stats.volume) * 100 : 0;
                      return (
                        <div key={sport} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <span className="font-medium">{sport}</span>
                            <span className="text-xs text-muted-foreground ml-2">({stats.count} apostas)</span>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "mono-number font-medium",
                              stats.profit >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {formatCurrency(stats.profit)}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatPercent(roi)} ROI</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* ROI Formula Explanation */}
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-base">Fórmulas de Cálculo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground mb-1">ROI (Return on Investment)</p>
                <code className="text-primary">ROI = (Lucro Total / Volume Total) × 100</code>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground mb-1">Win Rate</p>
                <code className="text-success">(Apostas Ganhas / Total de Apostas) × 100</code>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground mb-1">Lucro Esperado (EV)</p>
                <code className="text-warning">Σ (Stake × (EV% / 100))</code>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground mb-1">Lucro por Aposta</p>
                <code className="text-primary">
                  Green: Stake × (Odd - 1)<br/>
                  Red: -Stake<br/>
                  Meio Green/Red: ±Stake ÷ 2
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

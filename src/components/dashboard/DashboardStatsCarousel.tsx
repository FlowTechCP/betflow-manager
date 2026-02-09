import { useState, useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResultBadge } from '@/components/ui/result-badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import {
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { Bet, BetResult } from '@/types/database';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Legend,
} from 'recharts';

type BetWithRelations = Bet & {
  bookmaker: { name: string };
  account: { login_nick: string };
};

interface DashboardStatsCarouselProps {
  bets: BetWithRelations[] | undefined;
  isLoading: boolean;
}

function computeStats(bets: BetWithRelations[]) {
  const totalVolume = bets.reduce((sum, b) => sum + Number(b.stake), 0);
  const totalProfit = bets.reduce((sum, b) => sum + Number(b.profit), 0);
  const totalBets = bets.length;
  const winRate = totalBets > 0
    ? (bets.filter(b => b.result === 'green' || b.result === 'meio_green').length / totalBets) * 100
    : 0;
  const expectedValue = bets.reduce((sum, b) => sum + (Number(b.expected_value) || 0), 0);
  const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;

  return { totalVolume, totalProfit, totalBets, winRate, expectedValue, roi };
}

function computeSoftwareBreakdown(bets: BetWithRelations[]) {
  const map = new Map<string, BetWithRelations[]>();
  bets.forEach(bet => {
    const key = bet.software_tool || 'Outros';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(bet);
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, softBets]) => {
      const stats = computeStats(softBets);
      return { name, ...stats };
    });
}

export function DashboardStatsCarousel({ bets, isLoading }: DashboardStatsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const sections = useMemo(() => {
    if (!bets || bets.length === 0) return [{ label: 'Geral', bets: [] as BetWithRelations[] }];

    const softwareMap = new Map<string, BetWithRelations[]>();
    bets.forEach(bet => {
      const key = bet.software_tool || 'Outros';
      if (!softwareMap.has(key)) softwareMap.set(key, []);
      softwareMap.get(key)!.push(bet);
    });

    const sorted = [...softwareMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return [
      { label: 'Geral', bets },
      ...sorted.map(([label, sectionBets]) => ({ label, bets: sectionBets })),
    ];
  }, [bets]);

  const currentSection = sections[currentIndex];
  const stats = currentSection.bets.length > 0 ? computeStats(currentSection.bets) : null;

  const softwareBreakdown = useMemo(() => {
    if (!bets || bets.length === 0) return [];
    return computeSoftwareBreakdown(bets);
  }, [bets]);

  const totalRevenue = useMemo(() => {
    if (!bets) return 0;
    return bets.reduce((sum, b) => sum + Number(b.profit), 0);
  }, [bets]);

  const positiveUnits = useMemo(() => {
    if (!bets || bets.length === 0) return 0;
    // Units = total profit / average stake
    const avgStake = bets.reduce((s, b) => s + Number(b.stake), 0) / bets.length;
    return avgStake > 0 ? bets.reduce((s, b) => s + Number(b.profit), 0) / avgStake : 0;
  }, [bets]);

  const goNext = () => setCurrentIndex(i => (i + 1) % sections.length);
  const goPrev = () => setCurrentIndex(i => (i - 1 + sections.length) % sections.length);

  const chartData = softwareBreakdown.map(s => ({
    name: s.name,
    apostas: s.totalBets,
    roi: Number(s.roi.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Carousel Navigation */}
      {sections.length > 1 && (
        <div className="flex items-center justify-between px-2">
          <Button variant="ghost" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {sections.map((section, i) => (
              <button
                key={section.label}
                onClick={() => setCurrentIndex(i)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  i === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={goNext}>
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
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
              value={formatPercent(stats?.roi || 0)}
              icon={TrendingUp}
              variant={(stats?.roi || 0) >= 0 ? 'success' : 'danger'}
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

      {/* Software Breakdown Section - only on "Geral" view */}
      {currentIndex === 0 && !isLoading && softwareBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Software Table */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resumo por Software</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table text-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Software</th>
                      <th className="text-right">Total Apostado (R$)</th>
                      <th className="text-right">Lucro Total (R$)</th>
                      <th className="text-center">Qtd. Apostas</th>
                      <th className="text-right">ROI (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {softwareBreakdown.map(s => (
                      <tr key={s.name}>
                        <td className="font-bold">{s.name}</td>
                        <td className="mono-number text-right">{formatCurrency(s.totalVolume)}</td>
                        <td className={`mono-number font-medium text-right ${s.totalProfit >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {formatCurrency(s.totalProfit)}
                        </td>
                        <td className="mono-number text-center">{s.totalBets}</td>
                        <td className={`mono-number font-medium text-right ${s.roi >= 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {s.roi.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Combo Chart */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Apostas × ROI por Software
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="apostas" name="Qtd. Apostas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="roi" name="ROI (%)" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue + Units Cards */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1 flex flex-col items-center justify-center p-6">
              <p className="text-sm text-muted-foreground mb-1">Faturamento Total</p>
              <p className={`text-3xl font-bold mono-number ${totalRevenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalRevenue)}
              </p>
            </Card>
            <Card className="flex-1 flex flex-col items-center justify-center p-6">
              <p className="text-sm text-muted-foreground mb-1">Unidades Positivas</p>
              <p className={`text-3xl font-bold mono-number ${positiveUnits >= 0 ? 'text-success' : 'text-destructive'}`}>
                {positiveUnits.toFixed(2)}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Bets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Apostas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : currentSection.bets.length > 0 ? (
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
                  {currentSection.bets.slice(0, 10).map((bet) => (
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
  );
}

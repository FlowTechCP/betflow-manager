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
} from 'lucide-react';
import { Bet, BetResult } from '@/types/database';

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

  const goNext = () => setCurrentIndex(i => (i + 1) % sections.length);
  const goPrev = () => setCurrentIndex(i => (i - 1 + sections.length) % sections.length);

  return (
    <div className="space-y-6">
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

      {/* Carousel Navigation */}
      {sections.length > 1 && (
        <div className="flex items-center justify-between px-2">
          <Button variant="ghost" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
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
    </div>
  );
}

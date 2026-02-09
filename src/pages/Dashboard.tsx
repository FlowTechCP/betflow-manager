import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardStatsCarousel } from '@/components/dashboard/DashboardStatsCarousel';
import { Bet } from '@/types/database';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Visão geral da operação' : `Bem-vindo, ${profile?.name}`}
          </p>
        </div>

        <DashboardStatsCarousel bets={bets} isLoading={betsLoading} />
      </div>
    </DashboardLayout>
  );
}

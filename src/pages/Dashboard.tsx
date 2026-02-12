import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardStatsCarousel } from '@/components/dashboard/DashboardStatsCarousel';
import { Bet } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isBookmakerDialogOpen, setIsBookmakerDialogOpen] = useState(false);
  const [newBookmakerName, setNewBookmakerName] = useState('');

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

  const createBookmaker = useMutation({
    mutationFn: async () => {
      if (!newBookmakerName.trim()) throw new Error('Nome obrigatório');
      const { error } = await supabase.from('bookmakers').insert({ name: newBookmakerName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmakers'] });
      toast.success('Casa de apostas adicionada!');
      setNewBookmakerName('');
      setIsBookmakerDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Visão geral da operação' : `Bem-vindo, ${profile?.name}`}
            </p>
          </div>

          {isAdmin && (
            <Dialog open={isBookmakerDialogOpen} onOpenChange={setIsBookmakerDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Casa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Casa de Apostas</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createBookmaker.mutate();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="bookmaker-name">Nome da Casa</Label>
                    <Input
                      id="bookmaker-name"
                      value={newBookmakerName}
                      onChange={(e) => setNewBookmakerName(e.target.value)}
                      placeholder="Ex: Bet365, Betano..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createBookmaker.isPending}>
                    {createBookmaker.isPending ? 'Salvando...' : 'Adicionar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <DashboardStatsCarousel bets={bets} isLoading={betsLoading} />
      </div>
    </DashboardLayout>
  );
}

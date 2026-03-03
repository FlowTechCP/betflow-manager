import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/format';
import { ArrowDownToLine } from 'lucide-react';

interface AccountDepositHistoryProps {
  accountId: string;
  accountName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDepositHistory({ accountId, accountName, open, onOpenChange }: AccountDepositHistoryProps) {
  const { data: deposits, isLoading } = useQuery({
    queryKey: ['account-deposits', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!accountId,
  });

  const totalDeposited = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-primary" />
            Depósitos — {accountName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Total Depositado</span>
            <span className="font-bold mono-number text-lg">{formatCurrency(totalDeposited)}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : deposits && deposits.length > 0 ? (
            <div className="overflow-y-auto max-h-[300px]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Banco</th>
                    <th>Valor</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id}>
                      <td className="mono-number">{formatDate(d.date)}</td>
                      <td>{d.bank_name || '-'}</td>
                      <td className="mono-number font-medium text-success">{formatCurrency(Number(d.amount))}</td>
                      <td className="text-sm text-muted-foreground">{d.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum depósito registrado para esta conta.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

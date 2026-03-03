import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface AccountTransactionDialogProps {
  account: { id: string; name: string; currentBalance: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountTransactionDialog({ account, open, onOpenChange }: AccountTransactionDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState<'deposito' | 'saque'>('deposito');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [description, setDescription] = useState('');

  const { data: bankBalances } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_balances').select('*').order('bank_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const transaction = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !account) throw new Error('Dados inválidos');
      const value = parseFloat(amount);
      if (!value || value <= 0) throw new Error('Valor inválido');
      if (!bankName) throw new Error('Selecione um banco');

      const { data: acc } = await supabase
        .from('accounts')
        .select('current_balance, total_deposited')
        .eq('id', account.id)
        .single();
      if (!acc) throw new Error('Conta não encontrada');

      const { data: bank } = await supabase
        .from('bank_balances')
        .select('id, current_balance')
        .eq('bank_name', bankName)
        .single();
      if (!bank) throw new Error('Banco não encontrado');

      if (type === 'deposito') {
        // Create deposit record
        const { error: depErr } = await supabase.from('deposits').insert({
          date: new Date().toISOString().split('T')[0],
          account_id: account.id,
          amount: value,
          description: description || 'Depósito adicional',
          created_by: profile.id,
          bank_name: bankName,
        });
        if (depErr) throw depErr;

        // Increase account balance
        await supabase.from('accounts').update({
          current_balance: Number(acc.current_balance) + value,
          total_deposited: Number(acc.total_deposited) + value,
        }).eq('id', account.id);

        // Deduct from bank
        await supabase.from('bank_balances').update({
          current_balance: Number(bank.current_balance) - value,
        }).eq('id', bank.id);
      } else {
        // Saque: decrease account, increase bank
        if (Number(acc.current_balance) < value) {
          throw new Error('Saldo insuficiente na conta');
        }

        await supabase.from('accounts').update({
          current_balance: Number(acc.current_balance) - value,
        }).eq('id', account.id);

        await supabase.from('bank_balances').update({
          current_balance: Number(bank.current_balance) + value,
        }).eq('id', bank.id);

        // Register as deposit with negative for history (or create a withdrawal deposit record)
        const { error: depErr } = await supabase.from('deposits').insert({
          date: new Date().toISOString().split('T')[0],
          account_id: account.id,
          amount: -value,
          description: description || 'Saque da conta',
          created_by: profile.id,
          bank_name: bankName,
        });
        if (depErr) throw depErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-balances'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['account-deposits'] });
      toast.success(type === 'deposito' ? 'Depósito realizado!' : 'Saque realizado!');
      onOpenChange(false);
      setAmount('');
      setBankName('');
      setDescription('');
      setType('deposito');
    },
    onError: (e) => toast.error(e.message),
  });

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimentar — {account.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); transaction.mutate(); }} className="space-y-4 py-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Saldo atual:</span>
            <span className="font-bold mono-number">{formatCurrency(account.currentBalance)}</span>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'deposito' | 'saque')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposito">Depositar</SelectItem>
                <SelectItem value="saque">Sacar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{type === 'deposito' ? 'Banco de Origem' : 'Banco de Destino'}</Label>
            <Select value={bankName} onValueChange={setBankName} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {bankBalances?.map((bank) => (
                  <SelectItem key={bank.id} value={bank.bank_name}>
                    {bank.bank_name} — {formatCurrency(Number(bank.current_balance))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={transaction.isPending}>
              {transaction.isPending ? 'Processando...' : type === 'deposito' ? 'Depositar' : 'Sacar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

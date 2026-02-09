import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  BetResult,
  MarketTime,
  betResultLabels,
  marketTimeLabels,
  sportOptions,
  softwareOptions,
} from '@/types/database';

export interface BetFormData {
  date: string;
  account_id: string;
  stake: string;
  result: BetResult;
  odds: string;
  market_time: MarketTime;
  sport: string;
  software_tool: string;
  expected_value: string;
  teams: string;
  bet_description: string;
}

const emptyForm: BetFormData = {
  date: new Date().toISOString().split('T')[0],
  account_id: '',
  stake: '',
  result: 'pendente',
  odds: '',
  market_time: 'jogo_todo',
  sport: 'Futebol',
  software_tool: 'Live',
  expected_value: '',
  teams: '',
  bet_description: '',
};

interface BetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: BetFormData) => void;
  isPending: boolean;
  accounts: Array<{ id: string; login_nick: string; bookmaker_id: string; bookmaker: any }> | undefined;
  initialData?: BetFormData | null;
  title: string;
  submitLabel: string;
}

export function BetFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  accounts,
  initialData,
  title,
  submitLabel,
}: BetFormDialogProps) {
  const [form, setForm] = useState<BetFormData>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(initialData ?? emptyForm);
    }
  }, [open, initialData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4"
        >
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })} required>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.login_nick} ({a.bookmaker?.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor da Aposta (R$)</Label>
            <Input type="number" step="0.01" value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} placeholder="0.00" required />
          </div>

          <div className="space-y-2">
            <Label>ODD</Label>
            <Input type="number" step="0.001" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} placeholder="1.850" required />
          </div>

          <div className="space-y-2">
            <Label>Resultado</Label>
            <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v as BetResult })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(betResultLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tempo</Label>
            <Select value={form.market_time} onValueChange={(v) => setForm({ ...form, market_time: v as MarketTime })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(marketTimeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Esporte</Label>
            <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sportOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Software</Label>
            <Select value={form.software_tool} onValueChange={(v) => setForm({ ...form, software_tool: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {softwareOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>EV Esperado (R$)</Label>
            <Input type="number" step="0.01" value={form.expected_value} onChange={(e) => setForm({ ...form, expected_value: e.target.value })} placeholder="Opcional" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Times/Evento</Label>
            <Input value={form.teams} onChange={(e) => setForm({ ...form, teams: e.target.value })} placeholder="Ex: Palmeiras x Flamengo" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Descrição da Aposta</Label>
            <Input value={form.bet_description} onChange={(e) => setForm({ ...form, bet_description: e.target.value })} placeholder="Ex: Casa HA -0,5" />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

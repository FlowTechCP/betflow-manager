import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

interface Bookmaker {
  id: string;
  name: string;
  active: boolean;
  logo_url: string | null;
  created_at: string;
}

export default function Casas() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bookmaker | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);

  const { data: bookmakers, isLoading } = useQuery({
    queryKey: ['bookmakers-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bookmakers').select('*').order('name');
      if (error) throw error;
      return data as Bookmaker[];
    },
  });

  const openCreate = () => { setEditing(null); setFormName(''); setFormActive(true); setIsFormOpen(true); };
  const openEdit = (b: Bookmaker) => { setEditing(b); setFormName(b.name); setFormActive(b.active); setIsFormOpen(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formName.trim()) throw new Error('Nome é obrigatório');
      if (editing) {
        const { error } = await supabase.from('bookmakers').update({ name: formName.trim(), active: formActive }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bookmakers').insert({ name: formName.trim(), active: formActive });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmakers'] });
      queryClient.invalidateQueries({ queryKey: ['bookmakers-all'] });
      toast.success(editing ? 'Casa atualizada!' : 'Casa adicionada!');
      setIsFormOpen(false);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookmakers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmakers'] });
      queryClient.invalidateQueries({ queryKey: ['bookmakers-all'] });
      toast.success('Casa excluída!');
      setDeletingId(null);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Casas de Apostas</h1>
            <p className="text-muted-foreground">Gerencie as casas de apostas disponíveis</p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova Casa
          </Button>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Casa' : 'Nova Casa de Apostas'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Bet365" required />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>Ativa</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Casa</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza? Contas vinculadas podem ser afetadas.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Casas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : bookmakers && bookmakers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookmakers.map((b) => (
                      <tr key={b.id}>
                        <td className="font-medium">{b.name}</td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${b.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {b.active ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(b.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhuma casa cadastrada.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

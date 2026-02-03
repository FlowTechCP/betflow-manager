import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AppRole } from '@/types/database';
import { cn } from '@/lib/utils';
import { OperatorFilters } from '@/components/operadores/OperatorFilters';
import { DeleteOperatorDialog } from '@/components/operadores/DeleteOperatorDialog';

interface OperatorWithRoles {
  id: string;
  name: string;
  email: string | null;
  roles: AppRole[];
}

export default function Operadores() {
  const { isAdmin, profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorWithRoles | null>(null);

  // Fetch operators with their roles
  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role as AppRole),
      }));
    },
    enabled: isAdmin,
  });

  // Filter operators based on search and role
  const filteredOperators = useMemo(() => {
    if (!operators) return [];
    
    return operators.filter(operator => {
      const matchesSearch = 
        operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (operator.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesRole = 
        roleFilter === 'all' ||
        (roleFilter === 'admin' && operator.roles.includes('admin')) ||
        (roleFilter === 'operator' && !operator.roles.includes('admin'));
      
      return matchesSearch && matchesRole;
    });
  }, [operators, searchTerm, roleFilter]);

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ profileId, newRole }: { profileId: string; newRole: AppRole }) => {
      await supabase.from('user_roles').delete().eq('user_id', profileId);
      
      const { error } = await supabase.from('user_roles').insert({
        user_id: profileId,
        role: newRole,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      toast.success('Permissão atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    },
  });

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (profileId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { profileId },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      toast.success('Usuário excluído com sucesso!');
      setDeleteDialogOpen(false);
      setOperatorToDelete(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir usuário: ' + error.message);
    },
  });

  const handleDeleteClick = (operator: OperatorWithRoles) => {
    setOperatorToDelete(operator);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (operatorToDelete) {
      deleteUser.mutate(operatorToDelete.id);
    }
  };

  const isCurrentUser = (operatorId: string) => profile?.id === operatorId;

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Operadores</h1>
          <p className="text-muted-foreground">Gerenciamento de usuários e permissões</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="stat-card">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Operadores</p>
                <p className="text-2xl font-bold">{operators?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">
                  {operators?.filter(o => o.roles.includes('admin')).length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Operadores</p>
                <p className="text-2xl font-bold">
                  {operators?.filter(o => o.roles.includes('operator') && !o.roles.includes('admin')).length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <OperatorFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
        />

        {/* Operators Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Operadores
              {filteredOperators.length !== operators?.length && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredOperators.length} de {operators?.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredOperators.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Função Atual</th>
                      <th>Alterar Função</th>
                      <th className="w-16">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOperators.map((operator) => (
                      <tr key={operator.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary text-sm font-medium">
                                {operator.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">{operator.name}</span>
                              {isCurrentUser(operator.id) && (
                                <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-muted-foreground">{operator.email}</td>
                        <td>
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            operator.roles.includes('admin') 
                              ? "bg-success/20 text-success"
                              : "bg-warning/20 text-warning"
                          )}>
                            {operator.roles.includes('admin') ? 'Administrador' : 'Operador'}
                          </span>
                        </td>
                        <td>
                          <Select
                            value={operator.roles.includes('admin') ? 'admin' : 'operator'}
                            onValueChange={(value) => updateRole.mutate({ 
                              profileId: operator.id, 
                              newRole: value as AppRole 
                            })}
                            disabled={isCurrentUser(operator.id)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Operador</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(operator)}
                            disabled={isCurrentUser(operator.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title={isCurrentUser(operator.id) ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : operators && operators.length > 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum operador encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum operador encontrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteOperatorDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        operatorName={operatorToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteUser.isPending}
      />
    </DashboardLayout>
  );
}

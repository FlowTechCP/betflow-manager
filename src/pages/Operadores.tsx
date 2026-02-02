import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Users, Shield, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Profile, AppRole } from '@/types/database';
import { cn } from '@/lib/utils';

export default function Operadores() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch operators with their roles
  const { data: operators, isLoading } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      // Fetch roles for each profile
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id).map(r => r.role as AppRole),
      }));
    },
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ profileId, newRole }: { profileId: string; newRole: AppRole }) => {
      // First delete existing roles
      await supabase.from('user_roles').delete().eq('user_id', profileId);
      
      // Then insert new role
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

        {/* Operators Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Operadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : operators && operators.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Função Atual</th>
                      <th>Alterar Função</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((operator) => (
                      <tr key={operator.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary text-sm font-medium">
                                {operator.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{operator.name}</span>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum operador encontrado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

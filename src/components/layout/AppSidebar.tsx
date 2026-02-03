import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Wallet, 
  TrendingUp, 
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const operatorMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Apostas', url: '/apostas', icon: Receipt },
  { title: 'Contas', url: '/contas', icon: CreditCard },
];

const adminMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Apostas', url: '/apostas', icon: Receipt },
  { title: 'Contas', url: '/contas', icon: CreditCard },
  { title: 'Financeiro', url: '/financeiro', icon: Wallet },
  { title: 'Operadores', url: '/operadores', icon: Users },
  { title: 'Criar Usuário', url: '/criar-usuario', icon: UserPlus },
  { title: 'Analytics', url: '/analytics', icon: TrendingUp },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { isAdmin, profile, signOut } = useAuth();

  const menuItems = isAdmin ? adminMenuItems : operatorMenuItems;

  return (
    <Sidebar 
      className={cn(
        "border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">React App</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2 mb-2">
              Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          isActive 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && profile && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-sm font-medium">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'Operador'}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'danger' | 'primary';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className,
}: StatCardProps) {
  const variantClasses = {
    default: 'stat-card',
    success: 'stat-card-success',
    danger: 'stat-card-danger',
    primary: 'stat-card-primary',
  };

  return (
    <div className={cn(variantClasses[variant], 'animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mono-number">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            variant === 'success' && "bg-success/10 text-success",
            variant === 'danger' && "bg-destructive/10 text-destructive",
            variant === 'primary' && "bg-primary/10 text-primary",
            variant === 'default' && "bg-secondary text-muted-foreground",
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

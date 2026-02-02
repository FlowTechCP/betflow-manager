import { cn } from '@/lib/utils';
import { AccountStatus, accountStatusLabels } from '@/types/database';

interface StatusBadgeProps {
  status: AccountStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusClasses: Record<AccountStatus, string> = {
    em_uso: 'bg-success/20 text-success',
    limitada: 'bg-destructive/20 text-destructive',
    cevando: 'bg-warning/20 text-warning',
    transferida: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={cn(
      'px-2 py-1 rounded text-xs font-medium',
      statusClasses[status],
      className
    )}>
      {accountStatusLabels[status]}
    </span>
  );
}

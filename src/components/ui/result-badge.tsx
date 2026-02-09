import { cn } from '@/lib/utils';
import { BetResult, betResultLabels } from '@/types/database';

interface ResultBadgeProps {
  result: BetResult;
  className?: string;
}

export function ResultBadge({ result, className }: ResultBadgeProps) {
  const resultClasses: Record<BetResult, string> = {
    pendente: 'result-void',
    green: 'result-green',
    red: 'result-red',
    void: 'result-void',
    meio_green: 'result-meio-green',
    meio_red: 'result-meio-red',
  };

  return (
    <span className={cn(resultClasses[result], className)}>
      {betResultLabels[result]}
    </span>
  );
}

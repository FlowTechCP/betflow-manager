import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteOperatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatorName: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteOperatorDialog({
  open,
  onOpenChange,
  operatorName,
  onConfirm,
  isDeleting,
}: DeleteOperatorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{operatorName}</strong>? 
            Esta ação não pode ser desfeita. Todas as apostas e contas associadas 
            a este usuário permanecerão no sistema, mas sem vínculo com o operador.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

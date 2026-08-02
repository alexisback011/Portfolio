import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ConfirmDialog = ({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
    <AlertDialogContent className="dashboard-surface">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className={cn(
            destructive &&
              "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
          )}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDialog;

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { ConflictAlert } from "../../shared/hooks/useBookingDates";

interface ConflictAlertDialogProps {
  conflictAlert: ConflictAlert;
  onDismiss: () => void;
}

export function ConflictAlertDialog({
  conflictAlert,
  onDismiss,
}: ConflictAlertDialogProps) {
  return (
    <AlertDialog open={conflictAlert.open} onOpenChange={() => onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{conflictAlert.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {conflictAlert.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onDismiss}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

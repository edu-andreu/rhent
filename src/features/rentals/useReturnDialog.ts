import { useState, useCallback } from "react";

export interface UseReturnDialogOptions {
  /** Callback invoked after a rental return is successfully completed */
  onReturnComplete: () => Promise<void>;
}

/**
 * Hook for managing rental return dialog state and handlers.
 * Provides state management for the return checkout dialog.
 * 
 * @param options - Configuration object with callback
 * @returns Object containing:
 * - returnDialogOpen: Boolean indicating if the return dialog is open
 * - returningRentalItemId: ID of the rental item being returned (null if none)
 * - returnDrawerError: Error message related to cash drawer (null if none)
 * - setReturnDrawerError: Function to set/clear drawer error
 * - handleReturn: Handler to open return dialog for a rental
 * - handleReturnConfirm: Handler to confirm and complete the return
 * - closeDialog: Handler to close the return dialog
 */
export function useReturnDialog(options: UseReturnDialogOptions) {
  const { onReturnComplete } = options;

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returningRentalItemId, setReturningRentalItemId] = useState<string | null>(null);
  const [returnDrawerError, setReturnDrawerError] = useState<string | null>(null);

  const handleReturn = useCallback((rentalItemId: string) => {
    setReturningRentalItemId(rentalItemId);
    setReturnDialogOpen(true);
  }, []);

  const handleReturnConfirm = useCallback(async () => {
    await onReturnComplete();
    setReturnDialogOpen(false);
    setReturningRentalItemId(null);
  }, [onReturnComplete]);

  const closeDialog = useCallback(() => {
    setReturnDialogOpen(false);
    setReturningRentalItemId(null);
  }, []);

  return {
    returnDialogOpen,
    returningRentalItemId,
    returnDrawerError,
    setReturnDrawerError,
    handleReturn,
    handleReturnConfirm,
    closeDialog,
  };
}

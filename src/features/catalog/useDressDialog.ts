import { useState, useCallback } from "react";
import { Dress } from "../../types";

export interface UseDressDialogOptions {
  /** Callback invoked after a dress is successfully added or updated */
  onDressAdded: () => void;
  /** Callback invoked when a dress is deleted. Receives the deleted dress ID. */
  onDressDeleted: (dressId: string) => Promise<void>;
}

/**
 * Hook for managing dress add/edit/delete dialog state and handlers.
 * Provides state management for dress dialogs and handles user interactions.
 * 
 * @param options - Configuration object with callbacks
 * @returns Object containing:
 * - showAddDressDialog: Boolean indicating if the add/edit dialog is open
 * - dressToEdit: The dress being edited (null if adding new)
 * - dressToDelete: The dress pending deletion (null if none)
 * - deleteDialogOpen: Boolean indicating if the delete confirmation dialog is open
 * - setDeleteDialogOpen: Function to control delete dialog visibility
 * - handleAddDress: Handler for successful dress add/edit
 * - handleEditDress: Handler to open edit dialog for a dress
 * - handleDeleteDress: Handler to open delete confirmation for a dress
 * - handleAddNewDress: Handler to open add dialog for a new dress
 * - confirmDeleteDress: Handler to confirm and execute dress deletion
 * - closeAddDialog: Handler to close the add/edit dialog
 */
export function useDressDialog(options: UseDressDialogOptions) {
  const { onDressAdded, onDressDeleted } = options;

  const [showAddDressDialog, setShowAddDressDialog] = useState(false);
  const [dressToEdit, setDressToEdit] = useState<Dress | null>(null);
  const [dressToDelete, setDressToDelete] = useState<Dress | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAddDress = useCallback(() => {
    onDressAdded();
    setDressToEdit(null);
    setShowAddDressDialog(false);
  }, [onDressAdded]);

  const handleEditDress = useCallback((dress: Dress) => {
    setDressToEdit(dress);
    setShowAddDressDialog(true);
  }, []);

  const handleDeleteDress = useCallback((dress: Dress) => {
    setDressToDelete(dress);
    setDeleteDialogOpen(true);
  }, []);

  const handleAddNewDress = useCallback(() => {
    setDressToEdit(null);
    setShowAddDressDialog(true);
  }, []);

  const confirmDeleteDress = useCallback(async () => {
    if (dressToDelete) {
      await onDressDeleted(dressToDelete.id);
      setDeleteDialogOpen(false);
      setDressToDelete(null);
    }
  }, [dressToDelete, onDressDeleted]);

  const closeAddDialog = useCallback(() => {
    setShowAddDressDialog(false);
    setDressToEdit(null);
  }, []);

  return {
    showAddDressDialog,
    dressToEdit,
    dressToDelete,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleAddDress,
    handleEditDress,
    handleDeleteDress,
    handleAddNewDress,
    confirmDeleteDress,
    closeAddDialog,
  };
}

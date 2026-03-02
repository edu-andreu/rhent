import { useState, useCallback } from "react";
import { Customer, CartItem } from "../../types";

export interface UseCustomerDialogOptions {
  /** Callback invoked when a new customer is added. Returns true if successful. */
  onCustomerAdded: (customer: Omit<Customer, "id" | "createdAt">) => Promise<boolean>;
  /** Callback invoked when a customer is updated. Returns true if successful. */
  onCustomerUpdated: (customerId: string, customer: Omit<Customer, "id" | "createdAt">) => Promise<boolean>;
  /** Current cart items (used to determine if dialog was opened from checkout) */
  cartItems: CartItem[];
  /** Callback to open the checkout dialog (used when returning from customer dialog) */
  onOpenCheckout: () => void;
}

/**
 * Hook for managing customer add/edit dialog state and handlers.
 * Provides state management for customer dialogs and handles navigation back to checkout flow.
 * 
 * @param options - Configuration object with callbacks and cart state
 * @returns Object containing:
 * - showAddCustomerDialog: Boolean indicating if the add/edit dialog is open
 * - customerToEdit: The customer being edited (null if adding new)
 * - handleAddCustomer: Handler for customer add/edit submission
 * - handleEditCustomer: Handler to open edit dialog for a customer
 * - handleAddNewCustomer: Handler to open add dialog for a new customer
 * - closeDialog: Handler to close the dialog (returns to checkout if applicable)
 */
export function useCustomerDialog(options: UseCustomerDialogOptions) {
  const { onCustomerAdded, onCustomerUpdated, cartItems, onOpenCheckout } = options;

  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const handleAddCustomer = useCallback(
    async (customer: Omit<Customer, "id" | "createdAt">) => {
      const success = customerToEdit
        ? await onCustomerUpdated(customerToEdit.id, customer)
        : await onCustomerAdded(customer);
      if (success) {
        setCustomerToEdit(null);
        setShowAddCustomerDialog(false);
        // If we came from checkout (cart has items and wasn't editing), return to checkout
        if (!customerToEdit && cartItems.length > 0) {
          onOpenCheckout();
        }
      }
    },
    [customerToEdit, onCustomerAdded, onCustomerUpdated, cartItems.length, onOpenCheckout]
  );

  const handleEditCustomer = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setShowAddCustomerDialog(true);
  }, []);

  const handleAddNewCustomer = useCallback(() => {
    setCustomerToEdit(null);
    setShowAddCustomerDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setShowAddCustomerDialog(false);
    const wasEditing = !!customerToEdit;
    setCustomerToEdit(null);
    // If we came from checkout (cart has items and wasn't editing), return to checkout
    if (!wasEditing && cartItems.length > 0) {
      onOpenCheckout();
    }
  }, [customerToEdit, cartItems.length, onOpenCheckout]);

  return {
    showAddCustomerDialog,
    customerToEdit,
    handleAddCustomer,
    handleEditCustomer,
    handleAddNewCustomer,
    closeDialog,
  };
}

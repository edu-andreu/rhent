import { createContext, useContext, useCallback, ReactNode } from "react";
import { Dress, Customer, CartItem } from "../types";
import { useDressDialog } from "../features/catalog/useDressDialog";
import { useCustomerDialog } from "../features/customers/useCustomerDialog";
import { useReturnDialog } from "../features/rentals/useReturnDialog";
import { useCheckout } from "../features/checkout/useCheckout";
import { RentalDialog } from "../components/RentalDialog";
import { ReservationDialog } from "../components/ReservationDialog";
import { Cart } from "../components/Cart";
import { CheckoutDialog } from "../components/CheckoutDialog";
import { ReturnCheckoutDialog } from "../components/ReturnCheckoutDialog";
import { AddDressDialog } from "../components/AddDressDialog";
import { AddCustomerDialog } from "../components/AddCustomerDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DialogType =
  | "rental"
  | "reservation"
  | "cart"
  | "checkout"
  | "addDress"
  | "deleteDress"
  | "addCustomer"
  | "returnCheckout";

export interface DialogContextValue {
  // Generic helpers
  openDialog: (type: DialogType, data?: unknown) => void;
  closeDialog: (type: DialogType) => void;
  getDialogState: (type: DialogType) => { isOpen: boolean; data: unknown };

  // Checkout / cart operations exposed so tabs can trigger them
  handleRent: (dress: Dress) => void;
  handleReserve: (dress: Dress) => void;
  handleBuy: (dress: Dress) => void;
  cartItems: CartItem[];
  openCart: () => void;

  // Dress dialog triggers
  handleEditDress: (dress: Dress) => void;
  handleDeleteDress: (dress: Dress) => void;
  handleAddNewDress: () => void;

  // Customer dialog triggers
  handleEditCustomer: (customer: Customer) => void;
  handleAddNewCustomer: () => void;

  // Return dialog trigger
  handleReturn: (rentalItemId: string) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider props – receives the callbacks the hooks need from the data layer
// ---------------------------------------------------------------------------

export interface DialogProviderProps {
  children: ReactNode;
  customers: Customer[];
  onPaymentSuccess: () => Promise<void>;
  onDressAdded: () => void;
  onDressDeleted: (dressId: string) => Promise<void>;
  onCustomerAdded: (customer: Omit<Customer, "id" | "createdAt">) => Promise<boolean>;
  onCustomerUpdated: (customerId: string, customer: Omit<Customer, "id" | "createdAt">) => Promise<boolean>;
  onReturnComplete: () => Promise<void>;
}

export function DialogProvider({
  children,
  customers,
  onPaymentSuccess,
  onDressAdded,
  onDressDeleted,
  onCustomerAdded,
  onCustomerUpdated,
  onReturnComplete,
}: DialogProviderProps) {
  // ---- Compose the existing hooks inside the provider ----

  const checkout = useCheckout({ onPaymentSuccess });
  const {
    cartItems,
    showCart,
    setShowCart,
    showCheckout,
    setShowCheckout,
    checkoutDrawerError,
    setCheckoutDrawerError,
    selectedDressForRental,
    setSelectedDressForRental,
    selectedDressForReservation,
    setSelectedDressForReservation,
    handleRent,
    handleReserve,
    handleBuy,
    confirmRental,
    confirmReservation,
    handleCheckout,
    handleRemoveFromCart,
    handleUpdateItemNotes,
    handlePaymentComplete,
    openCheckout,
  } = checkout;

  const dressDialog = useDressDialog({ onDressAdded, onDressDeleted });

  const customerDialog = useCustomerDialog({
    onCustomerAdded,
    onCustomerUpdated,
    cartItems,
    onOpenCheckout: openCheckout,
  });

  const returnDialog = useReturnDialog({ onReturnComplete });

  // ---- Generic open / close / get helpers ----

  const openDialog = useCallback(
    (type: DialogType, data?: unknown) => {
      switch (type) {
        case "rental":
          if (data) setSelectedDressForRental(data as Dress);
          break;
        case "reservation":
          if (data) setSelectedDressForReservation(data as Dress);
          break;
        case "cart":
          setShowCart(true);
          break;
        case "checkout":
          openCheckout();
          break;
        case "addDress":
          if (data) dressDialog.handleEditDress(data as Dress);
          else dressDialog.handleAddNewDress();
          break;
        case "deleteDress":
          if (data) dressDialog.handleDeleteDress(data as Dress);
          break;
        case "addCustomer":
          if (data) customerDialog.handleEditCustomer(data as Customer);
          else customerDialog.handleAddNewCustomer();
          break;
        case "returnCheckout":
          if (data) returnDialog.handleReturn(data as string);
          break;
      }
    },
    [
      setSelectedDressForRental,
      setSelectedDressForReservation,
      setShowCart,
      openCheckout,
      dressDialog,
      customerDialog,
      returnDialog,
    ]
  );

  const closeDialog = useCallback(
    (type: DialogType) => {
      switch (type) {
        case "rental":
          setSelectedDressForRental(null);
          break;
        case "reservation":
          setSelectedDressForReservation(null);
          break;
        case "cart":
          setShowCart(false);
          break;
        case "checkout":
          setShowCheckout(false);
          break;
        case "addDress":
          dressDialog.closeAddDialog();
          break;
        case "deleteDress":
          dressDialog.setDeleteDialogOpen(false);
          break;
        case "addCustomer":
          customerDialog.closeDialog();
          break;
        case "returnCheckout":
          returnDialog.closeDialog();
          break;
      }
    },
    [
      setSelectedDressForRental,
      setSelectedDressForReservation,
      setShowCart,
      setShowCheckout,
      dressDialog,
      customerDialog,
      returnDialog,
    ]
  );

  const getDialogState = useCallback(
    (type: DialogType): { isOpen: boolean; data: unknown } => {
      switch (type) {
        case "rental":
          return { isOpen: !!selectedDressForRental, data: selectedDressForRental };
        case "reservation":
          return { isOpen: !!selectedDressForReservation, data: selectedDressForReservation };
        case "cart":
          return { isOpen: showCart, data: cartItems };
        case "checkout":
          return { isOpen: showCheckout, data: cartItems };
        case "addDress":
          return { isOpen: dressDialog.showAddDressDialog, data: dressDialog.dressToEdit };
        case "deleteDress":
          return { isOpen: dressDialog.deleteDialogOpen, data: dressDialog.dressToDelete };
        case "addCustomer":
          return { isOpen: customerDialog.showAddCustomerDialog, data: customerDialog.customerToEdit };
        case "returnCheckout":
          return { isOpen: returnDialog.returnDialogOpen, data: returnDialog.returningRentalItemId };
        default:
          return { isOpen: false, data: null };
      }
    },
    [
      selectedDressForRental,
      selectedDressForReservation,
      showCart,
      showCheckout,
      cartItems,
      dressDialog,
      customerDialog,
      returnDialog,
    ]
  );

  // ---- Context value ----

  const value: DialogContextValue = {
    openDialog,
    closeDialog,
    getDialogState,

    handleRent,
    handleReserve,
    handleBuy,
    cartItems,
    openCart: useCallback(() => setShowCart(true), [setShowCart]),

    handleEditDress: dressDialog.handleEditDress,
    handleDeleteDress: dressDialog.handleDeleteDress,
    handleAddNewDress: dressDialog.handleAddNewDress,

    handleEditCustomer: customerDialog.handleEditCustomer,
    handleAddNewCustomer: customerDialog.handleAddNewCustomer,

    handleReturn: returnDialog.handleReturn,
  };

  const closeRentalDialog = useCallback(() => setSelectedDressForRental(null), []);
  const closeReservationDialog = useCallback(() => setSelectedDressForReservation(null), []);
  const closeCart = useCallback(() => setShowCart(false), []);
  const closeCheckoutDialog = useCallback(() => setShowCheckout(false), []);
  const clearDrawerError = useCallback(() => setCheckoutDrawerError(null), []);
  const handleCheckoutAddCustomer = useCallback(() => {
    setShowCheckout(false);
    customerDialog.handleAddNewCustomer();
  }, [customerDialog.handleAddNewCustomer]);

  return (
    <DialogContext.Provider value={value}>
      {children}

      {!!selectedDressForRental && (
        <RentalDialog
          dress={selectedDressForRental}
          open
          onClose={closeRentalDialog}
          onConfirm={confirmRental}
        />
      )}

      {!!selectedDressForReservation && (
        <ReservationDialog
          dress={selectedDressForReservation}
          open
          onClose={closeReservationDialog}
          onConfirm={confirmReservation}
        />
      )}

      {showCart && (
        <Cart
          open
          onClose={closeCart}
          items={cartItems}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={handleCheckout}
          onUpdateItemNotes={handleUpdateItemNotes}
        />
      )}

      {showCheckout && (
        <CheckoutDialog
          open
          onClose={closeCheckoutDialog}
          onConfirm={handlePaymentComplete}
          cartItems={cartItems}
          customers={customers}
          onAddNewCustomer={handleCheckoutAddCustomer}
          drawerError={checkoutDrawerError}
          onClearDrawerError={clearDrawerError}
        />
      )}

      {dressDialog.showAddDressDialog && (
        <AddDressDialog
          open
          onClose={dressDialog.closeAddDialog}
          onAdd={dressDialog.handleAddDress}
          editDress={dressDialog.dressToEdit || undefined}
        />
      )}

      {customerDialog.showAddCustomerDialog && (
        <AddCustomerDialog
          open
          onClose={customerDialog.closeDialog}
          onAdd={customerDialog.handleAddCustomer}
          editCustomer={customerDialog.customerToEdit || undefined}
        />
      )}

      {dressDialog.deleteDialogOpen && (
        <AlertDialog
          open
          onOpenChange={dressDialog.setDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{dressDialog.dressToDelete?.name}&quot; from your
                inventory. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={dressDialog.confirmDeleteDress}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {returnDialog.returnDialogOpen && (
        <ReturnCheckoutDialog
          open
          rentalItemId={returnDialog.returningRentalItemId}
          onClose={returnDialog.closeDialog}
          onConfirm={returnDialog.handleReturnConfirm}
        />
      )}
    </DialogContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

import { useCart } from "./hooks/useCart";
import { useCheckoutDialog } from "./hooks/useCheckoutDialog";
import { usePayment } from "./hooks/usePayment";
import { toast } from "sonner@2.0.3";

export interface UseCheckoutOptions {
  /** Called after successful checkout; parent should refetch rentals, reservations, dresses, customers */
  onPaymentSuccess: () => Promise<void>;
}

/**
 * Composed hook that combines cart management, dialog state, and payment processing.
 * This hook orchestrates the checkout flow by composing three focused hooks:
 * - useCart: Cart state and operations
 * - useCheckoutDialog: Dialog visibility and selected dress state
 * - usePayment: Payment processing logic
 */
export function useCheckout(options: UseCheckoutOptions) {
  const { onPaymentSuccess } = options;

  // Cart management
  const cart = useCart();
  const {
    cartItems,
    setCartItems,
    handleBuy,
    addRentalToCart,
    addReservationToCart,
    handleRemoveFromCart,
    handleUpdateItemNotes,
    clearCart,
  } = cart;

  // Dialog state management
  const dialog = useCheckoutDialog();
  const {
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
    handleCheckout,
    openCheckout,
    clearCheckoutDrawerError,
    clearSelectedDresses,
  } = dialog;

  // Payment processing
  const payment = usePayment({
    onPaymentSuccess,
    cartItems,
    clearCart,
    closeCheckout: () => setShowCheckout(false),
    setCheckoutDrawerError,
  });
  const { handlePaymentComplete } = payment;

  // Composed handlers that bridge cart and dialog concerns
  const confirmRental = (
    startDate: Date,
    endDate: Date,
    extraDays?: number,
    totalAmount?: number,
    standardPrice?: number,
    extraDaysTotal?: number
  ) => {
    if (selectedDressForRental) {
      addRentalToCart(
        selectedDressForRental,
        startDate,
        endDate,
        extraDays,
        totalAmount,
        standardPrice,
        extraDaysTotal
      );
      setSelectedDressForRental(null);
    }
  };

  const confirmReservation = (
    startDate: Date,
    endDate: Date,
    extraDays?: number,
    totalAmount?: number,
    standardPrice?: number,
    extraDaysTotal?: number
  ) => {
    if (selectedDressForReservation) {
      addReservationToCart(
        selectedDressForReservation,
        startDate,
        endDate,
        extraDays,
        totalAmount,
        standardPrice,
        extraDaysTotal
      );
      setSelectedDressForReservation(null);
    }
  };

  // Wrap handleRemoveFromCart to add toast notification
  const handleRemoveFromCartWithToast = (itemId: string) => {
    handleRemoveFromCart(itemId);
    toast.success("Item removed from cart");
  };

  return {
    // Cart state and operations
    cartItems,
    setCartItems,
    handleBuy,
    handleRemoveFromCart: handleRemoveFromCartWithToast,
    handleUpdateItemNotes,

    // Dialog state
    showCart,
    setShowCart,
    showCheckout,
    setShowCheckout,
    checkoutDrawerError,
    setCheckoutDrawerError: clearCheckoutDrawerError,
    selectedDressForRental,
    setSelectedDressForRental,
    selectedDressForReservation,
    setSelectedDressForReservation,

    // Handlers
    handleRent,
    handleReserve,
    confirmRental,
    confirmReservation,
    handleCheckout,
    handlePaymentComplete,
    openCheckout,
  };
}

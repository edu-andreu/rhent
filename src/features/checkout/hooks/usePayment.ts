import { useCallback } from "react";
import { CartItem } from "../../../types";
import { postFunction, ApiError } from "../../../shared/api/client";
import { toast } from "sonner@2.0.3";
import { getDrawerErrorMessage } from "../../../shared/utils/drawerError";
import { ERROR_MESSAGES } from "../../../shared/constants/errors";

export interface UsePaymentOptions {
  /** Called after successful checkout; parent should refetch rentals, reservations, dresses, customers */
  onPaymentSuccess: () => Promise<void>;
  /** Current cart items */
  cartItems: CartItem[];
  /** Function to clear cart after successful payment */
  clearCart: () => void;
  /** Function to close checkout dialog */
  closeCheckout: () => void;
  /** Function to set drawer error */
  setCheckoutDrawerError: (error: string | null) => void;
}

export function usePayment(options: UsePaymentOptions) {
  const { onPaymentSuccess, cartItems, clearCart, closeCheckout, setCheckoutDrawerError } = options;

  const handlePaymentComplete = useCallback(
    async (
      payments: Array<{ methodId: string; methodName: string; amount: number }>,
      discount?: { type: "percentage" | "fixed"; value: number; reason?: string },
      customerId?: string,
      updatedCartItems?: CartItem[],
      creditApplied?: number
    ) => {
      const itemsToCheckout = updatedCartItems ?? cartItems;

      if (itemsToCheckout.length === 0) return;
      if (!customerId) {
        toast.error(ERROR_MESSAGES.CUSTOMER_REQUIRED);
        return;
      }
      const hasPayments = payments.length > 0;
      const hasCredit = (creditApplied ?? 0) > 0.01;
      if (!hasPayments && !hasCredit) return;

      try {
        await postFunction<{ rentalId?: string }>("checkout", {
          cartItems: itemsToCheckout,
          payments,
          discount,
          customerId,
          ...(creditApplied != null && creditApplied !== 0 ? { creditApplied } : {}),
        });

        clearCart();
        closeCheckout();
        setCheckoutDrawerError(null);

        await onPaymentSuccess();

        const newRentalsCount = itemsToCheckout.filter((i) => i.type === "rental").length;
        const newReservationsCount = itemsToCheckout.filter((i) => i.type === "reservation").length;
        toast.success(
          `Payment successful! ${newRentalsCount} rental(s) and ${newReservationsCount} reservation(s) confirmed.`
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const data = error instanceof ApiError ? error.data : undefined;
        const dataObj =
          data && typeof data === "object" && "error" in data
            ? (data as { error?: string; errorType?: string })
            : undefined;

        const drawerErrorMsg = getDrawerErrorMessage(error);
        if (drawerErrorMsg) {
          setCheckoutDrawerError(drawerErrorMsg);
        } else if (dataObj?.errorType === "booking_conflict") {
          toast.error(dataObj.error ?? ERROR_MESSAGES.BOOKING_CONFLICT, { duration: 5000 });
        } else {
          toast.error(errMsg || ERROR_MESSAGES.CHECKOUT_FAILED);
        }
      }
    },
    [cartItems, onPaymentSuccess, clearCart, closeCheckout, setCheckoutDrawerError]
  );

  return {
    handlePaymentComplete,
  };
}

import { useCallback } from "react";
import { Reservation } from "../../types";
import { toast } from "sonner@2.0.3";

export interface UseReservationActionsOptions {
  /** Current reservations array */
  reservations: Reservation[];
  /** Function to update the reservations array */
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  /** Callback invoked when a reservation is converted to a rental */
  onConvertToRental: () => Promise<void>;
}

/**
 * Hook for managing reservation-related actions.
 * Provides handlers for cancelling, rescheduling, confirming, and converting reservations.
 * 
 * @param options - Configuration object with reservations state and callback
 * @returns Object containing:
 * - handleCancelReservation: Handler to cancel a reservation
 * - handleRescheduleReservation: Handler to reschedule a reservation to a new date
 * - handleConvertToRental: Handler to convert a reservation to a rental
 * - handleConfirmReservation: Handler to confirm a pending reservation
 */
export function useReservationActions(options: UseReservationActionsOptions) {
  const { reservations, setReservations, onConvertToRental } = options;

  const handleCancelReservation = useCallback(
    (reservationId: string) => {
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: "cancelled" as const } : r
        )
      );
      toast.success("Reservation cancelled successfully!");
    },
    [setReservations]
  );

  const handleRescheduleReservation = useCallback(
    (reservationId: string, newDate: Date) => {
      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? { ...r, reservationDate: newDate } : r))
      );
      toast.success("Reservation rescheduled successfully!");
    },
    [setReservations]
  );

  const handleConvertToRental = useCallback(async () => {
    await onConvertToRental();
  }, [onConvertToRental]);

  const handleConfirmReservation = useCallback(
    (reservationId: string) => {
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: "confirmed" as const } : r
        )
      );
      toast.success("Reservation confirmed!");
    },
    [setReservations]
  );

  return {
    handleCancelReservation,
    handleRescheduleReservation,
    handleConvertToRental,
    handleConfirmReservation,
  };
}

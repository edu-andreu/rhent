import { MyReservations } from "../../components/MyReservations";
import { Reservation } from "../../types";

interface ReservationsTabProps {
  reservations: Reservation[];
  onCancel: (reservationId: string) => void;
  onReschedule: (reservationId: string, newDate: Date) => void;
  onConvertToRental: () => void;
  onConfirm: (reservationId: string) => void;
}

export function ReservationsTab({
  reservations,
  onCancel,
  onReschedule,
  onConvertToRental,
  onConfirm,
}: ReservationsTabProps) {
  return (
    <div className="h-full">
      <MyReservations
        reservations={reservations}
        onCancel={onCancel}
        onReschedule={onReschedule}
        onConvertToRental={onConvertToRental}
        onConfirm={onConfirm}
      />
    </div>
  );
}

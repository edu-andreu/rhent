import { useMemo } from "react";
import { Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Reservation } from "../types";
import { RESERVATION_STATUS } from "../shared/constants/status";

interface ReservationStatsProps {
  reservations: Reservation[];
}

export function ReservationStats({ reservations }: ReservationStatsProps) {
  // Memoize stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: reservations.length,
      pending: reservations.filter(r => r.status === RESERVATION_STATUS.PENDING).length,
      confirmed: reservations.filter(r => r.status === RESERVATION_STATUS.CONFIRMED).length,
      upcoming: reservations.filter(r => 
        r.status !== RESERVATION_STATUS.CANCELLED && r.reservationDate >= today
      ).length,
      cancelled: reservations.filter(r => r.status === RESERVATION_STATUS.CANCELLED).length,
    };
  }, [reservations]);

  return null;
}

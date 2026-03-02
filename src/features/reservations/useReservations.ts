import { useState } from "react";
import { Reservation } from "../../types";
import { ApiReservation, ApiReservationResponse } from "../../types/api";
import { getFunction } from "../../shared/api/client";
import { parseDateLocal } from "../../shared/utils/dateUtils";
import { handleApiError, handleApiErrorWithDefault } from "../../shared/utils/errorHandler";

/**
 * Hook for managing reservation data.
 * Handles loading active reservations from the server and parsing date fields.
 * 
 * @returns Object containing:
 * - reservations: Array of all active reservations
 * - setReservations: Function to update the reservations array
 * - loadReservations: Function to reload reservations from the server
 */
export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const loadReservations = async () => {
    try {
      const data = await getFunction<ApiReservationResponse>("reservations/active");
      const parsed = (data.reservations || []).map((r: ApiReservation): Reservation => ({
        ...r,
        reservationDate: parseDateLocal(r.reservationDate),
        createdAt: new Date(r.createdAt),
        startDate: r.startDate ? parseDateLocal(r.startDate) : undefined,
        endDate: r.endDate ? parseDateLocal(r.endDate) : undefined,
      }));
      setReservations(parsed);
    } catch (error) {
      setReservations(handleApiErrorWithDefault(error, "reservations", []));
    }
  };

  return {
    reservations,
    setReservations,
    loadReservations,
  };
}

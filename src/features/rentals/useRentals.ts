import { useState } from "react";
import { Rental } from "../../types";
import { ApiRental, ApiRentalResponse } from "../../types/api";
import { getFunction } from "../../shared/api/client";
import { parseDateLocal } from "../../shared/utils/dateUtils";
import { handleApiError, handleApiErrorWithDefault } from "../../shared/utils/errorHandler";

/**
 * Hook for managing rental data.
 * Handles loading active rentals from the server and parsing date fields.
 * 
 * @returns Object containing:
 * - rentals: Array of all active rentals
 * - setRentals: Function to update the rentals array
 * - loadRentals: Function to reload rentals from the server
 */
export function useRentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);

  const loadRentals = async () => {
    try {
      const data = await getFunction<ApiRentalResponse>("rentals/active");
      const parsed = (data.rentals || []).map((r: ApiRental): Rental => ({
        ...r,
        startDate: parseDateLocal(r.startDate),
        endDate: parseDateLocal(r.endDate),
      }));
      setRentals(parsed);
    } catch (error) {
      setRentals(handleApiErrorWithDefault(error, "rentals", []));
    }
  };

  return {
    rentals,
    setRentals,
    loadRentals,
  };
}

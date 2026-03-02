import { useState, useEffect } from "react";
import { Holiday } from "../utils/dateUtils";
import { getFunction, getErrorMessage } from "../api/client";
import { toast } from "sonner@2.0.3";

// Global cache for holidays (persists across component mounts/unmounts)
let holidaysCache: Holiday[] | null = null;
let holidaysFetchPromise: Promise<Holiday[]> | null = null;

/**
 * Hook to fetch and cache holidays
 * Provides loading state and error handling
 * 
 * @param enabled - Whether to fetch holidays (default: true)
 * @returns Object with holidays array, loading state, and error state
 */
export function useHolidays(enabled: boolean = true) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchHolidays = async (): Promise<Holiday[]> => {
      // If we already have a pending request, wait for it
      if (holidaysFetchPromise) {
        return holidaysFetchPromise;
      }

      // If we have cached holidays, return them
      if (holidaysCache) {
        return Promise.resolve(holidaysCache);
      }

      // Create a new fetch promise
      holidaysFetchPromise = (async () => {
        try {
          const data = await getFunction<{ holidays: Holiday[] }>("holidays");
          
          // Server returns { holidays: [...] }
          const holidaysList: Holiday[] = data.holidays || [];

          // Cache the result
          holidaysCache = holidaysList;
          return holidaysList;
        } catch (error) {
          console.error("Error fetching holidays:", error);
          throw error;
        } finally {
          holidaysFetchPromise = null;
        }
      })();

      return holidaysFetchPromise;
    };

    const loadHolidays = async () => {
      try {
        setLoading(true);
        setError(false);
        const fetchedHolidays = await fetchHolidays();
        setHolidays(fetchedHolidays);
      } catch (error) {
        console.error("Failed to load holidays:", error);
        setError(true);
        setHolidays([]);
        toast.error(`Failed to load holidays: ${getErrorMessage(error)}`);
      } finally {
        setLoading(false);
      }
    };

    loadHolidays();
  }, [enabled]);

  return { holidays, loading, error };
}

/**
 * Clear the holidays cache (useful for testing or when holidays are updated)
 */
export function clearHolidaysCache() {
  holidaysCache = null;
  holidaysFetchPromise = null;
}

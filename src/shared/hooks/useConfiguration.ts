import { useState, useEffect } from "react";
import { ApiConfigurationResponse } from "../../types/api";
import { getFunction, getErrorMessage } from "../api/client";
import { toast } from "sonner@2.0.3";

export interface RentalConfiguration {
  rentalDays: number;
  extraDaysPrice: number;
  rentDownPct?: number;
  reservationDownPct?: number;
  blockPrevDays?: number;
  blockNextDays?: number;
}

// Global cache for configuration (persists across component mounts/unmounts)
let configCache: RentalConfiguration | null = null;
let configFetchPromise: Promise<RentalConfiguration> | null = null;

const DEFAULT_CONFIG: RentalConfiguration = {
  rentalDays: 3,
  extraDaysPrice: 75,
  rentDownPct: 50,
  reservationDownPct: 30,
  blockPrevDays: 4,
  blockNextDays: 1,
};

/**
 * Hook to fetch and cache rental configuration
 * Provides loading state and error handling
 * 
 * @param enabled - Whether to fetch configuration (default: true)
 * @returns Object with configuration, loading state, and error state
 */
export function useConfiguration(enabled: boolean = true) {
  const [config, setConfig] = useState<RentalConfiguration>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchConfig = async (): Promise<RentalConfiguration> => {
      // If we already have a pending request, wait for it
      if (configFetchPromise) {
        return configFetchPromise;
      }

      // If we have cached config, return it
      if (configCache) {
        return Promise.resolve(configCache);
      }

      // Create a new fetch promise
      configFetchPromise = (async () => {
        try {
          const data = await getFunction<ApiConfigurationResponse>("get-configuration");
          
          const serverConfig = data.config || {};
          
          const config: RentalConfiguration = {
            rentalDays: parseInt(serverConfig.rentalDays || String(DEFAULT_CONFIG.rentalDays), 10),
            extraDaysPrice: parseFloat(serverConfig.extraDaysPrice || String(DEFAULT_CONFIG.extraDaysPrice)),
            rentDownPct: parseFloat(serverConfig.rentDownPayment || String(DEFAULT_CONFIG.rentDownPct || 50)),
            reservationDownPct: parseFloat(serverConfig.reservationDownPayment || String(DEFAULT_CONFIG.reservationDownPct || 30)),
            blockPrevDays: parseInt(serverConfig.blockPrevDays || String(DEFAULT_CONFIG.blockPrevDays || 4), 10),
            blockNextDays: parseInt(serverConfig.blockNextDays || String(DEFAULT_CONFIG.blockNextDays || 1), 10),
          };

          // Validate and fallback to defaults if invalid
          if (isNaN(config.rentalDays) || config.rentalDays <= 0) {
            config.rentalDays = DEFAULT_CONFIG.rentalDays;
          }
          if (isNaN(config.extraDaysPrice) || config.extraDaysPrice < 0) {
            config.extraDaysPrice = DEFAULT_CONFIG.extraDaysPrice;
          }

          // Cache the result
          configCache = config;
          return config;
        } catch (error) {
          console.error("Error fetching configuration:", error);
          // Return defaults on error
          return DEFAULT_CONFIG;
        } finally {
          configFetchPromise = null;
        }
      })();

      return configFetchPromise;
    };

    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(false);
        const fetchedConfig = await fetchConfig();
        setConfig(fetchedConfig);
      } catch (error) {
        console.error("Failed to load configuration:", error);
        setError(true);
        setConfig(DEFAULT_CONFIG);
        toast.warning("Using default rental settings");
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [enabled]);

  return { config, loading, error };
}

/**
 * Clear the configuration cache (useful for testing or when config is updated)
 */
export function clearConfigurationCache() {
  configCache = null;
  configFetchPromise = null;
}

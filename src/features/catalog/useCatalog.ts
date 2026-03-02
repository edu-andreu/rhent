import { useState, useEffect } from "react";
import { Dress } from "../../types";
import { getFunction, postFunction, putFunction, deleteFunction } from "../../shared/api/client";
import { toast } from "sonner@2.0.3";
import { handleApiError, handleApiErrorWithDefault } from "../../shared/utils/errorHandler";

/**
 * Hook for managing catalog (dress inventory) operations.
 * Handles loading dresses, catalog configuration, and dress management operations.
 * 
 * @returns Object containing:
 * - dresses: Array of all dresses in the catalog
 * - setDresses: Function to update the dresses array
 * - loadingDresses: Boolean indicating if dresses are being loaded
 * - defaultReturnLocationId: ID of the default return location
 * - showroomLocationId: ID of the showroom location
 * - movingToShowroomId: ID of the dress currently being moved to showroom (null if none)
 * - loadDresses: Function to reload dresses from the server
 * - loadCatalogConfig: Function to reload catalog configuration
 * - repairCorruptedItems: Function to repair corrupted inventory items
 * - moveToShowroom: Function to move a dress to the showroom location
 * - deleteDress: Function to delete a dress from the catalog
 */
export function useCatalog() {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loadingDresses, setLoadingDresses] = useState(true);
  const [defaultReturnLocationId, setDefaultReturnLocationId] = useState<string | null>(null);
  const [showroomLocationId, setShowroomLocationId] = useState<string | null>(null);
  const [movingToShowroomId, setMovingToShowroomId] = useState<string | null>(null);

  const loadDresses = async () => {
    try {
      setLoadingDresses(true);
      const data = await getFunction<{ dresses: Dress[] }>("inventory-items");
      setDresses(data.dresses || []);
    } catch (error) {
      setDresses(handleApiErrorWithDefault(error, "dresses", []));
    } finally {
      setLoadingDresses(false);
    }
  };

  const loadCatalogConfig = async () => {
    try {
      const data = await getFunction<{ defaultReturnLocationId?: string; showroomLocationId?: string }>("catalog-config");
      setDefaultReturnLocationId(data.defaultReturnLocationId || null);
      setShowroomLocationId(data.showroomLocationId || null);
    } catch (error) {
      handleApiError(error, "catalog config");
    }
  };

  const repairCorruptedItems = async () => {
    try {
      const data = await postFunction<{ repaired: number }>("repair-items");
      if (data.repaired > 0) {
        await loadDresses();
      }
    } catch (error) {
      console.error("Error running repair:", error);
    }
  };

  const moveToShowroom = async (dress: Dress) => {
    if (!showroomLocationId) {
      toast.error("Showroom location not found. Please check your location settings.");
      return;
    }
    setMovingToShowroomId(dress.id);
    try {
      const result = await putFunction<{ item: Dress }>(`inventory-items/${dress.id}`, {
        locationId: showroomLocationId,
      });
      if (result.item) {
        setDresses((prev) => prev.map((d) => (d.id === dress.id ? result.item : d)));
      }
      toast.success(`${dress.name} moved to Showroom`);
    } catch (error) {
      console.error("Error moving item to Showroom:", error);
      toast.error(getErrorMessage(error, "Failed to move item to Showroom"));
    } finally {
      setMovingToShowroomId(null);
    }
  };

  const deleteDress = async (dressId: string) => {
    try {
      await deleteFunction(`inventory-items/${dressId}`);
      await loadDresses();
      toast.success("Dress deleted successfully!");
    } catch (error) {
      console.error("Error deleting dress:", error);
      toast.error(getErrorMessage(error, "Failed to delete dress"));
    }
  };

  useEffect(() => {
    loadDresses();
    loadCatalogConfig();
    repairCorruptedItems();
  }, []);

  return {
    dresses,
    setDresses,
    loadingDresses,
    defaultReturnLocationId,
    showroomLocationId,
    movingToShowroomId,
    loadDresses,
    loadCatalogConfig,
    repairCorruptedItems,
    moveToShowroom,
    deleteDress,
  };
}

import { useState, useCallback } from "react";
import { Dress } from "../../../types";

export function useCheckoutDialog() {
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutDrawerError, setCheckoutDrawerError] = useState<string | null>(null);
  const [selectedDressForRental, setSelectedDressForRental] = useState<Dress | null>(null);
  const [selectedDressForReservation, setSelectedDressForReservation] = useState<Dress | null>(null);

  const handleRent = useCallback((dress: Dress) => {
    setSelectedDressForRental(dress);
  }, []);

  const handleReserve = useCallback((dress: Dress) => {
    setSelectedDressForReservation(dress);
  }, []);

  const handleCheckout = useCallback(() => {
    setShowCart(false);
    setShowCheckout(true);
  }, []);

  const openCheckout = useCallback(() => setShowCheckout(true), []);

  const clearCheckoutDrawerError = useCallback(() => setCheckoutDrawerError(null), []);

  const clearSelectedDresses = useCallback(() => {
    setSelectedDressForRental(null);
    setSelectedDressForReservation(null);
  }, []);

  return {
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
  };
}

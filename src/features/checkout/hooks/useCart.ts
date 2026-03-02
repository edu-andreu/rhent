import { useState, useCallback } from "react";
import { Dress, CartItem } from "../../../types";
import { addToCartWithDuplicateCheck } from "../../../shared/utils/cartUtils";

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleBuy = useCallback((dress: Dress) => {
    setCartItems((prev) => {
      const cartItem: CartItem = {
        id: Date.now().toString(),
        type: "sale",
        dress,
        amount: dress.salePrice ?? 0,
      };
      return addToCartWithDuplicateCheck(prev, cartItem, dress.name);
    });
  }, []);

  const addRentalToCart = useCallback(
    (
      dress: Dress,
      startDate: Date,
      endDate: Date,
      extraDays?: number,
      totalAmount?: number,
      standardPrice?: number,
      extraDaysTotal?: number
    ) => {
      setCartItems((prev) => {
        const days =
          Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const cartItem: CartItem = {
          id: Date.now().toString(),
          type: "rental",
          dress,
          startDate,
          endDate,
          amount: totalAmount ?? dress.pricePerDay,
          days,
          extraDays,
          standardPrice,
          extraDaysTotal,
        };
        return addToCartWithDuplicateCheck(prev, cartItem, dress.name);
      });
    },
    []
  );

  const addReservationToCart = useCallback(
    (
      dress: Dress,
      startDate: Date,
      endDate: Date,
      extraDays?: number,
      totalAmount?: number,
      standardPrice?: number,
      extraDaysTotal?: number
    ) => {
      setCartItems((prev) => {
        const days =
          Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const cartItem: CartItem = {
          id: Date.now().toString(),
          type: "reservation",
          dress,
          startDate,
          endDate,
          reservationDate: startDate,
          amount: totalAmount ?? dress.pricePerDay,
          days,
          extraDays,
          standardPrice,
          extraDaysTotal,
        };
        return addToCartWithDuplicateCheck(prev, cartItem, dress.name);
      });
    },
    []
  );

  const handleRemoveFromCart = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleUpdateItemNotes = useCallback((itemId: string, notes: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, alterationNotes: notes } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  return {
    cartItems,
    setCartItems,
    handleBuy,
    addRentalToCart,
    addReservationToCart,
    handleRemoveFromCart,
    handleUpdateItemNotes,
    clearCart,
  };
}

import { toast } from "sonner@2.0.3";
import { CartItem } from "../../types";

/**
 * Checks if a dress is already in the cart and shows an error toast if it is.
 * 
 * @param cartItems - Current cart items
 * @param dressId - ID of the dress to check
 * @param dressName - Name of the dress (for error message)
 * @returns true if the dress is a duplicate, false otherwise
 */
export function checkDuplicateAndNotify(
  cartItems: CartItem[],
  dressId: string,
  dressName: string
): boolean {
  const isDuplicate = cartItems.some((item) => item.dress.id === dressId);
  if (isDuplicate) {
    toast.error(`${dressName} is already in your cart!`);
  }
  return isDuplicate;
}

/**
 * Adds a dress to the cart with duplicate checking.
 * Shows success toast on successful addition.
 * 
 * @param cartItems - Current cart items
 * @param newItem - New cart item to add
 * @param dressName - Name of the dress (for notifications)
 * @returns Updated cart items array, or original array if duplicate
 */
export function addToCartWithDuplicateCheck(
  cartItems: CartItem[],
  newItem: CartItem,
  dressName: string
): CartItem[] {
  if (checkDuplicateAndNotify(cartItems, newItem.dress.id, dressName)) {
    return cartItems;
  }
  
  toast.success(`${dressName} added to cart!`);
  return [...cartItems, newItem];
}

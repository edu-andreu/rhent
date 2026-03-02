/**
 * Types for Add/Edit item dialog.
 */

export type AddMode = "unique" | "variant";
export type SaleType = "rent" | "product" | "service";

export interface ItemDetails {
  id: string;
  sku: string;
  name: string;
  nameId: string;
  description: string;
  category: string;
  categoryId: string;
  subcategory: string;
  subcategoryId: string;
  brand: string;
  brandId: string;
  size: string;
  sizeId: string;
  colors: Array<{ id: string; color: string }>;
  colorId: string;
  pricePerDay: number;
  imageUrl: string;
  status: string;
  locationId: string;
  statusBadgeClass: string;
  available: boolean;
  isForSale?: boolean;
  salePrice?: number | null;
  stockQuantity?: number;
  isStockTracked?: boolean;
  lowStockThreshold?: number;
}

export interface AddDressFormData {
  name: string;
  nameId: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  brandId: string;
  sizeId: string;
  colorIds: string[];
  pricePerDay: string;
  imageUrl: string;
  locationId: string;
  stockQuantity: string;
  lowStockThreshold: string;
}

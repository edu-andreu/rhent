import { Label } from "../ui/label";
import { Sparkles, Package, ShoppingBag } from "lucide-react";
import type { SaleType } from "./types";

interface AddDressSaleTypeSelectionProps {
  saleType: SaleType;
  onSaleTypeChange: (type: SaleType) => void;
}

export function AddDressSaleTypeSelection({ saleType, onSaleTypeChange }: AddDressSaleTypeSelectionProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Sale Type</Label>
      <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-lg">
        <button
          type="button"
          onClick={() => onSaleTypeChange("rent")}
          className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
            saleType === "rent" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Rent</span>
        </button>
        <button
          type="button"
          onClick={() => onSaleTypeChange("product")}
          className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
            saleType === "product" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Sale (Product)</span>
        </button>
        <button
          type="button"
          onClick={() => onSaleTypeChange("service")}
          className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-md font-medium text-sm transition-all duration-200 ${
            saleType === "service" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Sale (Service)</span>
        </button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {saleType === "rent"
          ? "Standard rental item with date-based pricing and availability tracking"
          : saleType === "product"
            ? "Physical product for sale with stock tracking and low-stock alerts"
            : "Service or intangible item for sale with unlimited availability"}
      </p>
    </div>
  );
}

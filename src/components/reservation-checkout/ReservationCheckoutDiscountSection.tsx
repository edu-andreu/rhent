import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Percent, DollarSign, Tag, Pencil } from "lucide-react";

interface ReservationCheckoutDiscountSectionProps {
  showDiscountSection: boolean;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountReason: string;
  discountAmount: number;
  itemSubtotal: number;
  tempDiscountValue: string;
  tempDiscountReason: string;
  formatCurrency: (n: number) => string;
  onShowSection: () => void;
  onDiscountTypeChange: (v: "percentage" | "fixed") => void;
  onTempDiscountValueChange: (v: string) => void;
  onTempDiscountReasonChange: (v: string) => void;
  onApplyDiscount: () => void;
  onCancelDiscount: () => void;
  onEditDiscount: () => void;
}

export function ReservationCheckoutDiscountSection(p: ReservationCheckoutDiscountSectionProps) {
  const formatCurrency = p.formatCurrency;
  if (!p.showDiscountSection && p.discountValue === 0) {
    return (
      <div>
        <button type="button" onClick={p.onShowSection} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
          <Tag className="w-3.5 h-3.5" />
          <span>Apply discount</span>
        </button>
      </div>
    );
  }
  if (p.showDiscountSection && p.discountValue === 0) {
    return (
      <div className="border border-border rounded-lg p-3 space-y-2.5">
        <div className="flex items-center mb-1"><span className="text-sm font-medium">Apply Discount</span></div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={p.discountType} onValueChange={p.onDiscountTypeChange}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage"><div className="flex items-center gap-2"><Percent className="w-3.5 h-3.5" />Percentage</div></SelectItem>
              <SelectItem value="fixed"><div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" />Fixed Amount</div></SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Input type="number" value={p.tempDiscountValue} onChange={(e) => p.onTempDiscountValueChange(e.target.value)} placeholder="0" min={0} max={p.discountType === "percentage" ? 100 : p.itemSubtotal} step={p.discountType === "percentage" ? 1 : 100} className="h-9 pr-7" />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">{p.discountType === "percentage" ? "%" : "$"}</span>
          </div>
        </div>
        <Input type="text" value={p.tempDiscountReason} onChange={(e) => p.onTempDiscountReasonChange(e.target.value)} placeholder="Reason (optional)" maxLength={100} className="h-9 text-sm" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={p.onCancelDiscount} size="sm" className="flex-1 h-8">Cancel</Button>
          <Button type="button" onClick={p.onApplyDiscount} size="sm" className="flex-1 h-8" disabled={!p.tempDiscountValue || parseFloat(p.tempDiscountValue) <= 0}>Apply</Button>
        </div>
      </div>
    );
  }
  if (p.discountValue > 0) {
    return (
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <div className="text-sm">
              <span className="text-green-700 dark:text-green-300 font-medium">Discount {p.discountType === "percentage" ? `(${p.discountValue}%)` : ""}</span>
              {p.discountReason && <span className="text-green-600 dark:text-green-500 text-xs ml-1">- {p.discountReason}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-700 dark:text-green-300 font-semibold text-sm">-{formatCurrency(p.discountAmount)}</span>
            <button type="button" onClick={p.onEditDiscount} className="text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors" title="Edit discount">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

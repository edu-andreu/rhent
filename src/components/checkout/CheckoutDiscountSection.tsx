import React from "react";
import { Tag, Percent, DollarSign, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { formatCurrencyARS } from "../../shared/format/currency";

interface CheckoutDiscountSectionProps {
  showDiscountSection: boolean;
  setShowDiscountSection: (show: boolean) => void;
  discountType: 'percentage' | 'fixed';
  setDiscountType: (type: 'percentage' | 'fixed') => void;
  discountValue: number;
  discountAmount: number;
  discountReason: string;
  tempDiscountValue: string;
  setTempDiscountValue: (value: string) => void;
  tempDiscountReason: string;
  setTempDiscountReason: (value: string) => void;
  subtotal: number;
  handleApplyDiscount: () => void;
  handleCancelDiscount: () => void;
  handleRemoveDiscount: () => void;
}

export function CheckoutDiscountSection({
  showDiscountSection,
  setShowDiscountSection,
  discountType,
  setDiscountType,
  discountValue,
  discountAmount,
  discountReason,
  tempDiscountValue,
  setTempDiscountValue,
  tempDiscountReason,
  setTempDiscountReason,
  subtotal,
  handleApplyDiscount,
  handleCancelDiscount,
  handleRemoveDiscount,
}: CheckoutDiscountSectionProps) {
  const formatCurrency = formatCurrencyARS;

  return (
    <>
      {!showDiscountSection && discountValue === 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDiscountSection(true)}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Apply discount</span>
          </button>
        </div>
      )}

      {showDiscountSection && discountValue === 0 && (
        <div className="border border-border rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Apply Discount</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  <div className="flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5" />
                    Percentage
                  </div>
                </SelectItem>
                <SelectItem value="fixed">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" />
                    Fixed Amount
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Input
                type="number"
                value={tempDiscountValue}
                onChange={(e) => setTempDiscountValue(e.target.value)}
                placeholder="0"
                min="0"
                max={discountType === 'percentage' ? 100 : subtotal}
                step={discountType === 'percentage' ? 1 : 100}
                className="h-9 pr-7"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                {discountType === 'percentage' ? '%' : '$'}
              </span>
            </div>
          </div>

          <Input
            type="text"
            value={tempDiscountReason}
            onChange={(e) => setTempDiscountReason(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={100}
            className="h-9 text-sm"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCancelDiscount}
              variant="outline"
              size="sm"
              className="flex-1 h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplyDiscount}
              size="sm"
              className="flex-1 h-8"
              disabled={!tempDiscountValue || parseFloat(tempDiscountValue) <= 0}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {discountValue > 0 && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <div className="text-sm">
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}
                </span>
                {discountReason && (
                  <span className="text-green-600 dark:text-green-500 text-xs ml-1">
                    - {discountReason}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-700 dark:text-green-300 font-semibold text-sm">
                -{formatCurrency(discountAmount)}
              </span>
              <button
                type="button"
                onClick={handleRemoveDiscount}
                className="text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

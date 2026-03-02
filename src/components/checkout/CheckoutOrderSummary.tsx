import React from "react";
import { Calendar, Pencil } from "lucide-react";
import { CartItem } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { formatCurrencyARS } from "../../shared/format/currency";
import { formatDateObjectShort, formatDateObject } from "../../shared/format/date";
import type { CheckoutLineItemResult } from "../../shared/hooks/checkout";

interface CheckoutOrderSummaryProps {
  cartItems: CartItem[];
  calcItems: CheckoutLineItemResult[];
  subtotal: number;
  editingExtraDaysItemId: string | null;
  tempExtraDaysValue: string;
  setTempExtraDaysValue: (value: string) => void;
  onEditItemExtraDays: (itemId: string) => void;
  onApplyItemExtraDays: () => void;
  onRemoveItemExtraDays: (itemId: string) => void;
  onCancelItemExtraDays: () => void;
}

export function CheckoutOrderSummary({
  cartItems,
  calcItems,
  subtotal,
  editingExtraDaysItemId,
  tempExtraDaysValue,
  setTempExtraDaysValue,
  onEditItemExtraDays,
  onApplyItemExtraDays,
  onRemoveItemExtraDays,
  onCancelItemExtraDays,
}: CheckoutOrderSummaryProps) {
  const formatCurrency = formatCurrencyARS;

  return (
    <>
      <Separator />

      <div>
        <h3 className="mb-3">Order Summary ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</h3>
        <div className="space-y-3">
          {cartItems.map((item, index) => {
            const calcItem = calcItems[index];
            const originalExtraDays = item.extraDays || 0;
            const isEditing = editingExtraDaysItemId === item.id;
            const hasExtraDays = calcItem.extraDays > 0;
            const hadExtraDays = originalExtraDays > 0;
            const showExtraDaysRemoved = hadExtraDays && !hasExtraDays && !isEditing;

            return (
              <div key={item.id} className="p-3 bg-muted rounded-lg">
                <div className="flex gap-3">
                  <div className="w-20 h-20 flex-shrink-0">
                    <img
                      src={item.dress.imageUrl}
                      alt={item.dress.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.dress.name}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">Size {item.dress.size}</Badge>
                    </div>
                    {item.type === 'rental' && item.startDate && item.endDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Rented: {formatDateObjectShort(item.startDate)} - {formatDateObject(item.endDate)}
                        </span>
                      </div>
                    )}
                    {item.type === 'reservation' && item.startDate && item.endDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Reserved: {formatDateObjectShort(item.startDate)} - {formatDateObject(item.endDate)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(calcItem.basePrice)}</p>
                  </div>
                </div>

                {/* Per-item price breakdown with extra days */}
                {(hadExtraDays || hasExtraDays || isEditing) && (
                  <div className="mt-2 pt-1.5 border-t space-y-1">
                    {/* Display mode: extra days applied */}
                    {hasExtraDays && !isEditing && (
                      <div className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-700 dark:text-amber-400">
                            +{calcItem.extraDays} extra {calcItem.extraDays === 1 ? 'day' : 'days'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEditItemExtraDays(item.id)}
                            className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                            title="Edit extra days"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          +{formatCurrency(calcItem.extraDaysAmount)}
                        </span>
                      </div>
                    )}

                    {/* Link to re-apply when removed */}
                    {showExtraDaysRemoved && (
                      <button
                        type="button"
                        onClick={() => onEditItemExtraDays(item.id)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Apply extra days charge</span>
                      </button>
                    )}

                    {/* Inline editing mode */}
                    {isEditing && (
                      <div className="border border-amber-300 dark:border-amber-700 rounded-lg p-2 space-y-2 mt-1">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Extra Days Charge
                        </span>
                        <div>
                          <Label htmlFor={`extraDays-${item.id}`} className="text-xs mb-1 block">
                            Days (max: {originalExtraDays})
                          </Label>
                          <Input
                            id={`extraDays-${item.id}`}
                            type="number"
                            value={tempExtraDaysValue}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (e.target.value === '' || isNaN(val)) {
                                setTempExtraDaysValue(e.target.value);
                              } else {
                                setTempExtraDaysValue(Math.min(Math.max(0, val), originalExtraDays).toString());
                              }
                            }}
                            placeholder="0"
                            min="0"
                            max={originalExtraDays}
                            step="1"
                            className="h-8 text-sm"
                          />
                          {tempExtraDaysValue && parseInt(tempExtraDaysValue) >= 0 && calcItem.extraDayRate > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Amount: {formatCurrency((parseInt(tempExtraDaysValue) || 0) * calcItem.extraDayRate)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={() => onRemoveItemExtraDays(item.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                          >
                            Remove
                          </Button>
                          <Button
                            type="button"
                            onClick={onCancelItemExtraDays}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={onApplyItemExtraDays}
                            size="sm"
                            className="flex-1 h-7 text-xs"
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Item total when there are extra days or when editing */}
                    {(hasExtraDays && !isEditing) && (
                      <div className="flex justify-between items-center pt-0.5">
                        <span className="text-[11px] font-semibold">Item Total</span>
                        <span className="text-sm font-bold">{formatCurrency(calcItem.itemSubtotal)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </>
  );
}

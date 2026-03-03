import { Undo2, Calendar, Clock, Pencil } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { formatCurrencyARS } from "../../shared/format/currency";
import { formatDateDisplay } from "../../shared/format/date";

interface ReturnItem {
  name: string;
  size?: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  unitPrice: number;
}

export interface ExtraDaysProps {
  showSection: boolean;
  applicableDays: number;
  amount: number;
  count: number;
  rate: number;
  originalCount: number;
  tempValue: string;
  onShow: () => void;
  onTempChange: (value: string) => void;
  onApply: (days: number) => void;
  onCancel: () => void;
}

export interface LateFeeProps {
  applied: boolean;
  days: number;
  amount: number;
  applicableDays: number;
  rate: number;
  pricePct: number;
  showSection: boolean;
  tempDays: string;
  suggestedDays?: number;
  onShow: () => void;
  onTempChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onShowConfirm: () => void;
}

interface ReturnItemDetailsProps {
  item: ReturnItem;
  subtotal: number;
  extraDays: ExtraDaysProps;
  lateFee: LateFeeProps;
}

export function ReturnItemDetails({
  item,
  subtotal,
  extraDays,
  lateFee,
}: ReturnItemDetailsProps) {
  const formatCurrency = formatCurrencyARS;

  const hasExtraDays = extraDays.count > 0 && extraDays.amount > 0;
  const showExtraDaysLink = !extraDays.showSection && extraDays.applicableDays > 0 && !hasExtraDays;
  const hasLateFee = lateFee.applied && lateFee.days > 0;
  const showLateFeeLink = !lateFee.showSection && lateFee.applicableDays > 0 && !hasLateFee;
  const hasInlineBreakdown = hasExtraDays || extraDays.showSection || hasLateFee || lateFee.showSection || showExtraDaysLink || showLateFeeLink;

  return (
    <>
      <Separator />

      <div>
        <h3 className="mb-3">Returning Item</h3>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex gap-3">
              <div className="w-20 h-20 flex-shrink-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-muted-foreground/10 rounded flex items-center justify-center">
                    <Undo2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{item.name}</p>
                <div className="flex gap-1 mt-1">
                  {item.size && (
                    <Badge variant="outline" className="text-xs">Size {item.size}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Rented: {formatDateDisplay(item.startDate)} - {formatDateDisplay(item.endDate)}
                  </span>
                </div>
                {lateFee.suggestedDays !== undefined && lateFee.suggestedDays > 0 && !hasLateFee && (
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {lateFee.suggestedDays} {lateFee.suggestedDays === 1 ? 'day' : 'days'} late
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(item.unitPrice)}</p>
              </div>
            </div>

            {hasInlineBreakdown && (
              <div className="mt-2 pt-1.5 border-t space-y-1">
                {/* Extra days - display mode */}
                {hasExtraDays && !extraDays.showSection && (
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-700 dark:text-amber-400">
                        +{extraDays.count} extra {extraDays.count === 1 ? 'day' : 'days'}
                      </span>
                      <button
                        type="button"
                        onClick={extraDays.onShow}
                        className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                        title="Edit extra days"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      +{formatCurrency(extraDays.amount)}
                    </span>
                  </div>
                )}

                {/* Extra days - link to apply */}
                {showExtraDaysLink && (
                  <button
                    type="button"
                    onClick={extraDays.onShow}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Apply extra days charge</span>
                  </button>
                )}

                {/* Extra days - editing mode */}
                {extraDays.showSection && (
                  <div className="border border-amber-300 dark:border-amber-700 rounded-lg p-2 space-y-2 mt-1">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Extra Days Charge
                    </span>
                    <div>
                      <Label htmlFor="extraDays-return" className="text-xs mb-1 block">
                        Days (max: {extraDays.applicableDays})
                      </Label>
                      <Input
                        id="extraDays-return"
                        type="number"
                        value={extraDays.tempValue}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (e.target.value === '' || isNaN(val)) {
                            extraDays.onTempChange(e.target.value);
                          } else {
                            extraDays.onTempChange(Math.min(Math.max(0, val), extraDays.applicableDays).toString());
                          }
                        }}
                        placeholder="0"
                        min="0"
                        max={extraDays.applicableDays}
                        step="1"
                        className="h-8 text-sm"
                      />
                      {extraDays.tempValue && parseInt(extraDays.tempValue) >= 0 && extraDays.rate > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Amount: {formatCurrency((parseInt(extraDays.tempValue) || 0) * extraDays.rate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={extraDays.onCancel}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        Remove
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          const days = parseInt(extraDays.tempValue) || 0;
                          extraDays.onApply(Math.min(Math.max(0, days), extraDays.applicableDays));
                        }}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}

                {/* Late fee - display mode */}
                {hasLateFee && !lateFee.showSection && (
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-red-700 dark:text-red-400">
                        +{lateFee.days} late {lateFee.days === 1 ? 'day' : 'days'} fee
                      </span>
                      <button
                        type="button"
                        onClick={lateFee.onEdit}
                        className="text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                        title="Edit late fee"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-medium text-red-700 dark:text-red-400">
                      +{formatCurrency(lateFee.amount)}
                    </span>
                  </div>
                )}

                {/* Late fee - link to apply */}
                {showLateFeeLink && (
                  <button
                    type="button"
                    onClick={lateFee.onShow}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Apply late return charge</span>
                  </button>
                )}

                {/* Late fee - editing mode */}
                {lateFee.showSection && (
                  <div className="border border-red-300 dark:border-red-700 rounded-lg p-2 space-y-2 mt-1">
                    <span className="text-xs font-medium text-red-700 dark:text-red-300">
                      Late Return Charge
                    </span>
                    <div>
                      <Label htmlFor="lateFee-return" className="text-xs mb-1 block">
                        Late days (max: {lateFee.applicableDays})
                      </Label>
                      <Input
                        id="lateFee-return"
                        type="number"
                        value={lateFee.tempDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (e.target.value === '' || isNaN(val)) {
                            lateFee.onTempChange(e.target.value);
                          } else {
                            lateFee.onTempChange(Math.min(Math.max(0, val), lateFee.applicableDays).toString());
                          }
                        }}
                        placeholder="0"
                        min="0"
                        max={lateFee.applicableDays}
                        step="1"
                        className="h-8 text-sm"
                      />
                      {lateFee.tempDays && parseInt(lateFee.tempDays) >= 0 && lateFee.rate > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Rate: {lateFee.pricePct}% of daily price = {formatCurrency(lateFee.rate)}/day
                        </p>
                      )}
                      {lateFee.tempDays && parseInt(lateFee.tempDays) > 0 && lateFee.rate > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Amount: {formatCurrency((parseInt(lateFee.tempDays) || 0) * lateFee.rate)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hasLateFee ? (
                        <Button
                          type="button"
                          onClick={lateFee.onShowConfirm}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={lateFee.onCancel}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={lateFee.onApply}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        disabled={!lateFee.tempDays || parseInt(lateFee.tempDays) <= 0}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}

                {/* Item total when there are charges */}
                {(hasExtraDays || hasLateFee) && !extraDays.showSection && !lateFee.showSection && (
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-[11px] font-semibold">Item Total</span>
                    <span className="text-sm font-bold">{formatCurrency(item.unitPrice + extraDays.amount + lateFee.amount)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
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

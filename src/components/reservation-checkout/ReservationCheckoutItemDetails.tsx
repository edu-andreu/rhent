import { Sparkles, Calendar } from "lucide-react";
import { Badge } from "../ui/badge";
import { formatDateDisplay } from "../../shared/format/date";
import { ReservationCheckoutExtraDaysSection } from "./ReservationCheckoutExtraDaysSection";
import { ReservationCheckoutCancellationFeeSection } from "./ReservationCheckoutCancellationFeeSection";

interface Item {
  name: string;
  sku: string;
  size: string;
  colors: string[];
  imageUrl: string;
  unitPrice: number;
  startDate: string;
  endDate: string;
}

interface ReservationCheckoutItemDetailsProps {
  item: Item;
  formatCurrency: (n: number) => string;

  // Extra days (item-level) UI
  showExtraDaysSection: boolean;
  applicableExtraDays: number;
  extraDaysAmount: number;
  extraDaysCount: number;
  extraDayRate: number;
  originalExtraDaysCount: number;
  tempExtraDaysValue: string;
  onShowExtraDaysSection: () => void;
  onTempExtraDaysValueChange: (value: string) => void;
  onApplyExtraDays: (days: number) => void;
  onCancelExtraDays: () => void;
  onEditExtraDays: () => void;

  // Cancellation fee UI
  cancellationFeeAmount: number;
  originalCancellationFeeAmount: number;
  showCancellationFeeSection: boolean;
  tempCancellationFeeValue: string;
  onCancellationFeeTempValueChange: (value: string) => void;
  onApplyCancellationFee: (amount: number) => void;
  onRemoveCancellationFee: () => void;
  onEditCancellationFee: () => void;
  onCancelCancellationFeeEdit: () => void;
}

export function ReservationCheckoutItemDetails({
  item,
  formatCurrency,
  showExtraDaysSection,
  applicableExtraDays,
  extraDaysAmount,
  extraDaysCount,
  extraDayRate,
  originalExtraDaysCount,
  tempExtraDaysValue,
  onShowExtraDaysSection,
  onTempExtraDaysValueChange,
  onApplyExtraDays,
  onCancelExtraDays,
  onEditExtraDays,
  cancellationFeeAmount,
  originalCancellationFeeAmount,
  showCancellationFeeSection,
  tempCancellationFeeValue,
  onCancellationFeeTempValueChange,
  onApplyCancellationFee,
  onRemoveCancellationFee,
  onEditCancellationFee,
  onCancelCancellationFeeEdit,
}: ReservationCheckoutItemDetailsProps) {
  const hasExtraDays = extraDaysCount > 0 && extraDaysAmount > 0;
  const hasCancellationFee = cancellationFeeAmount > 0;
  const hasAnyExtraDaysUI =
    showExtraDaysSection || applicableExtraDays > 0 || extraDaysAmount > 0;
  const hasAnyChargesUI = hasAnyExtraDaysUI || hasCancellationFee || showCancellationFeeSection;
  const itemTotal = item.unitPrice + (extraDaysAmount || 0) + (cancellationFeeAmount || 0);

  return (
    <div>
      <h3 className="mb-3">Reservation Item</h3>
      <div className="space-y-3">
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex gap-3">
            <div className="w-20 h-20 flex-shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded" />
              ) : (
                <div className="w-full h-full bg-muted-foreground/10 rounded flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              {item.sku && (
                <p className="hidden text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                  {item.sku}
                </p>
              )}
              <div className="flex gap-1 mt-1 flex-wrap">
                {item.size && (
                  <Badge variant="outline" className="text-xs">
                    Size {item.size}
                  </Badge>
                )}
                {item.colors.map((color, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {color}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="w-3 h-3" />
                <span>
                  Reserved: {formatDateDisplay(item.startDate)} - {formatDateDisplay(item.endDate)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatCurrency(item.unitPrice)}</p>
            </div>
          </div>

          {hasAnyChargesUI && (
            <div className="mt-2 pt-1.5 border-t space-y-1">
              <ReservationCheckoutExtraDaysSection
                showExtraDaysSection={showExtraDaysSection}
                applicableExtraDays={applicableExtraDays}
                extraDaysAmount={extraDaysAmount}
                extraDaysCount={extraDaysCount}
                extraDayRate={extraDayRate}
                originalExtraDaysCount={originalExtraDaysCount}
                tempExtraDaysValue={tempExtraDaysValue}
                formatCurrency={formatCurrency}
                onShowSection={onShowExtraDaysSection}
                onTempValueChange={onTempExtraDaysValueChange}
                onApply={onApplyExtraDays}
                onCancel={onCancelExtraDays}
                onEdit={onEditExtraDays}
              />

              <ReservationCheckoutCancellationFeeSection
                showSection={showCancellationFeeSection}
                cancellationFeeAmount={cancellationFeeAmount}
                originalCancellationFeeAmount={originalCancellationFeeAmount}
                tempValue={tempCancellationFeeValue}
                formatCurrency={formatCurrency}
                onTempValueChange={onCancellationFeeTempValueChange}
                onApply={onApplyCancellationFee}
                onRemove={onRemoveCancellationFee}
                onEdit={onEditCancellationFee}
                onCancel={onCancelCancellationFeeEdit}
              />

              {(hasExtraDays || hasCancellationFee) && !showExtraDaysSection && !showCancellationFeeSection && (
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-[11px] font-semibold">Item Total</span>
                  <span className="text-sm font-bold">{formatCurrency(itemTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

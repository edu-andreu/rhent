import { AlertTriangle, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = {
  showSection: boolean;
  cancellationFeeAmount: number;
  originalCancellationFeeAmount: number;
  tempValue: string;
  formatCurrency: (n: number) => string;
  onTempValueChange: (value: string) => void;
  onApply: (amount: number) => void;
  onRemove: () => void;
  onEdit: () => void;
  onCancel: () => void;
};

export function ReservationCheckoutCancellationFeeSection({
  showSection,
  cancellationFeeAmount,
  originalCancellationFeeAmount,
  tempValue,
  formatCurrency,
  onTempValueChange,
  onApply,
  onRemove,
  onEdit,
  onCancel,
}: Props) {
  if (showSection) {
    return (
      <div className="border border-rose-300 dark:border-rose-700 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center mb-1">
          <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
            Edit Cancellation Fee
          </span>
        </div>
        <div>
          <Label htmlFor="res-cancel-fee" className="text-xs mb-1.5 block">
            Fee amount (original: {formatCurrency(originalCancellationFeeAmount)})
          </Label>
          <Input
            id="res-cancel-fee"
            type="number"
            value={tempValue}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (e.target.value === "" || isNaN(val)) onTempValueChange(e.target.value);
              else onTempValueChange(Math.max(0, val).toString());
            }}
            placeholder="0"
            min={0}
            step={1}
            className="h-9"
          />
        </div>
        <div className="flex gap-2">
          {cancellationFeeAmount > 0 ? (
            <Button type="button" onClick={onRemove} variant="outline" size="sm" className="flex-1 h-8">
              Remove
            </Button>
          ) : (
            <Button type="button" onClick={onCancel} variant="outline" size="sm" className="flex-1 h-8">
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => onApply(Math.max(0, parseFloat(tempValue) || 0))}
            size="sm"
            className="flex-1 h-8"
          >
            Apply
          </Button>
        </div>
      </div>
    );
  }

  if (cancellationFeeAmount > 0) {
    return (
      <div className="flex justify-between items-center text-[11px]">
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          <span className="text-rose-700 dark:text-rose-400">
            Cancellation fee (overdue)
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
            title="Edit cancellation fee"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <span className="font-medium text-rose-700 dark:text-rose-400">
          +{formatCurrency(cancellationFeeAmount)}
        </span>
      </div>
    );
  }

  return null;
}

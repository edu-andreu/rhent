import { Calendar, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Props = {
  showExtraDaysSection: boolean;
  applicableExtraDays: number;
  extraDaysAmount: number;
  extraDaysCount: number;
  extraDayRate: number;
  originalExtraDaysCount: number;
  tempExtraDaysValue: string;
  formatCurrency: (n: number) => string;
  onShowSection: () => void;
  onTempValueChange: (value: string) => void;
  onApply: (days: number) => void;
  onCancel: () => void;
  onEdit: () => void;
};

export function ReservationCheckoutExtraDaysSection({
  showExtraDaysSection,
  applicableExtraDays,
  extraDaysAmount,
  extraDaysCount,
  extraDayRate,
  originalExtraDaysCount,
  tempExtraDaysValue,
  formatCurrency,
  onShowSection,
  onTempValueChange,
  onApply,
  onCancel,
  onEdit,
}: Props) {
  if (!showExtraDaysSection && applicableExtraDays > 0 && extraDaysAmount === 0) {
    return (
      <div>
        <button type="button" onClick={onShowSection} className="flex items-center gap-1.5 text-sm text-foreground hover:text-foreground/80">
          <Calendar className="w-3.5 h-3.5" />
          <span>Extra days charge</span>
        </button>
      </div>
    );
  }
  if (showExtraDaysSection) {
    return (
      <div className="border border-amber-300 dark:border-amber-700 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center mb-1">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Apply Extra Days Charge</span>
        </div>
        <div>
          <Label htmlFor="res-extra-days" className="text-xs mb-1.5 block">Number of extra days (max: {applicableExtraDays})</Label>
          <Input
            id="res-extra-days"
            type="number"
            value={tempExtraDaysValue}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (e.target.value === "" || isNaN(val)) onTempValueChange(e.target.value);
              else onTempValueChange(Math.min(Math.max(0, val), applicableExtraDays).toString());
            }}
            placeholder="0"
            min={0}
            max={applicableExtraDays}
            step={1}
            className="h-9"
          />
          {tempExtraDaysValue && parseInt(tempExtraDaysValue) >= 0 && extraDayRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Amount: {formatCurrency((parseInt(tempExtraDaysValue) || 0) * extraDayRate)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onCancel} variant="outline" size="sm" className="flex-1 h-8">Cancel</Button>
          <Button type="button" onClick={() => onApply(Math.min(Math.max(0, parseInt(tempExtraDaysValue) || 0), applicableExtraDays))} size="sm" className="flex-1 h-8">Apply</Button>
        </div>
      </div>
    );
  }
  if (extraDaysAmount > 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              <span className="text-amber-700 dark:text-amber-300 font-medium">Extra days charge</span>
              <span className="text-amber-600 dark:text-amber-500 text-xs ml-1">({extraDaysCount} {extraDaysCount === 1 ? "day" : "days"})</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-700 dark:text-amber-300 font-semibold text-sm">+{formatCurrency(extraDaysAmount)}</span>
            <button type="button" onClick={onEdit} className="text-amber-600 dark:text-amber-500 hover:text-amber-700" title="Edit extra days charge">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

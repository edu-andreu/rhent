import { Loader2 } from "lucide-react";
import { PricingCalculation } from "../../shared/booking/pricing";
import { formatCurrencyARS } from "../../shared/format/currency";

interface PricingSummaryProps {
  pricing: PricingCalculation;
  itemName: string;
  title: string;
  extraDaysPricePercent?: number;
  isLoading: boolean;
  hasDates: boolean;
  children?: React.ReactNode;
}

export function PricingSummary({
  pricing,
  itemName,
  title,
  extraDaysPricePercent,
  isLoading,
  hasDates,
  children,
}: PricingSummaryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 bg-muted/20 rounded-lg">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!hasDates) {
    return (
      <div className="bg-muted/20 rounded-lg p-6 text-center text-sm text-muted-foreground">
        <p>Select dates to see pricing</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-base">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-muted-foreground">Item</span>
          <span className="font-medium">{itemName}</span>
        </div>

        {pricing.isExtended ? (
          <>
            <div className="flex justify-between items-center">
              <span>
                Standard rental ({pricing.standardDays}{" "}
                {pricing.standardDays === 1 ? "day" : "days"})
              </span>
              <span className="font-medium">
                {formatCurrencyARS(pricing.standardPrice)}
              </span>
            </div>
            <div className="flex justify-between items-center text-amber-700">
              <span>
                Extra days ({pricing.extraDays} &times;{" "}
                {formatCurrencyARS(pricing.extraDayRate)})
              </span>
              <span className="font-medium">
                {formatCurrencyARS(pricing.extraDaysTotal)}
              </span>
            </div>
            {extraDaysPricePercent !== undefined && (
              <p className="text-xs text-muted-foreground italic">
                Extra day rate: {extraDaysPricePercent}% of standard day price
              </p>
            )}
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span>
              Standard rental ({pricing.standardDays}{" "}
              {pricing.standardDays === 1 ? "day" : "days"})
            </span>
            <span className="font-medium">
              {formatCurrencyARS(pricing.standardPrice)}
            </span>
          </div>
        )}

        {children}

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-xl">
            {formatCurrencyARS(pricing.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

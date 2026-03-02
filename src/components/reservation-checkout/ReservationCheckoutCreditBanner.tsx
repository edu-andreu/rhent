import { Wallet } from "lucide-react";

interface ReservationCheckoutCreditBannerProps {
  creditApplied: number;
  formatCurrency: (n: number) => string;
}

export function ReservationCheckoutCreditBanner({ creditApplied, formatCurrency }: ReservationCheckoutCreditBannerProps) {
  if (creditApplied === 0) return null;
  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${
        creditApplied > 0
          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
          : "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
      }`}
    >
      <Wallet
        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
          creditApplied > 0 ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"
        }`}
      />
      <div>
        <p
          className={`text-sm font-medium ${
            creditApplied > 0 ? "text-green-700 dark:text-green-300" : "text-purple-700 dark:text-purple-300"
          }`}
        >
          {creditApplied > 0
            ? `Store credit applied: -${formatCurrency(creditApplied)}`
            : `Store debit applied: +${formatCurrency(Math.abs(creditApplied))}`}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            creditApplied > 0 ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"
          }`}
        >
          {creditApplied > 0
            ? "Credit has been automatically applied to reduce your balance."
            : "Outstanding balance has been added to the total due."}
        </p>
      </div>
    </div>
  );
}

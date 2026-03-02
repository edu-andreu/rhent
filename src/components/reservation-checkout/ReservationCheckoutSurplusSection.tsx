import { ArrowDownToLine, Wallet, CreditCard } from "lucide-react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface PaymentMethod {
  id: string;
  payment_method: string;
}

interface ReservationCheckoutSurplusSectionProps {
  surplus: number;
  surplusHandling: "refund" | "credit";
  refundMethodId: string;
  paymentMethods: PaymentMethod[];
  formatCurrency: (n: number) => string;
  onSurplusHandlingChange: (value: "refund" | "credit") => void;
  onRefundMethodIdChange: (value: string) => void;
}

export function ReservationCheckoutSurplusSection({
  surplus,
  surplusHandling,
  refundMethodId,
  paymentMethods,
  formatCurrency,
  onSurplusHandlingChange,
  onRefundMethodIdChange,
}: ReservationCheckoutSurplusSectionProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Overpayment</span>
        </div>
        <span className="text-amber-700 dark:text-amber-300 font-bold text-base">{formatCurrency(surplus)}</span>
      </div>
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Customer has paid more than the order total. Choose how to handle the difference:
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSurplusHandlingChange("credit")}
          className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-all ${
            surplusHandling === "credit"
              ? "border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
              : "border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/50"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          Store Credit
        </button>
        <button
          type="button"
          onClick={() => onSurplusHandlingChange("refund")}
          className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-all ${
            surplusHandling === "refund"
              ? "border-amber-500 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
              : "border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/50"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Refund
        </button>
      </div>
      {surplusHandling === "refund" && (
        <div>
          <Label className="text-xs text-amber-700 dark:text-amber-300 mb-1.5 block">Refund via</Label>
          <Select value={refundMethodId} onValueChange={onRefundMethodIdChange}>
            <SelectTrigger className="h-9 border-amber-300 dark:border-amber-700">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.id}>
                  {method.payment_method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {surplusHandling === "credit" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {formatCurrency(surplus)} overpayment will be absorbed. No refund will be issued.
        </p>
      )}
    </div>
  );
}

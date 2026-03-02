import { CreditCard, Check } from "lucide-react";
import { Label } from "../ui/label";
import { formatCurrencyARS } from "../../shared/format/currency";

interface PaymentMethod {
  id: string;
  payment_method: string;
}

interface ReturnPaymentSectionProps {
  hasBalance: boolean;
  paymentMethods: PaymentMethod[];
  allocatedTotal: number;
  balanceDue: number;
  remainingAmount: number;
  isMethodSelected: (methodId: string) => boolean;
  getMethodAmount: (methodId: string) => number;
  togglePaymentMethod: (methodId: string) => void;
  updatePaymentAmount: (methodId: string, amount: number) => void;
}

export function ReturnPaymentSection({
  hasBalance,
  paymentMethods,
  allocatedTotal,
  balanceDue,
  remainingAmount,
  isMethodSelected,
  getMethodAmount,
  togglePaymentMethod,
  updatePaymentAmount,
}: ReturnPaymentSectionProps) {
  const formatCurrency = formatCurrencyARS;

  return (
    <div>
      <Label className="mb-2 block font-semibold">
        Payment Method(s)
      </Label>

      {!hasBalance ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No payment required - balance is fully covered.</p>
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No payment methods available.</p>
          <p className="text-xs mt-1">Add payment methods in Settings</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {paymentMethods.map((method) => {
            const isSelected = isMethodSelected(method.id);
            const methodAmount = getMethodAmount(method.id);

            return (
              <div
                key={method.id}
                className={`px-2.5 py-2 rounded-md border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="cursor-pointer"
                    onClick={() => togglePaymentMethod(method.id)}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}>
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      )}
                    </div>
                  </div>

                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{method.payment_method}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      value={isSelected ? methodAmount : ''}
                      onChange={(e) => updatePaymentAmount(method.id, parseFloat(e.target.value) || 0)}
                      disabled={!isSelected}
                      placeholder="0"
                      className="w-24 px-2 py-1 text-sm text-right border rounded disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allocatedTotal > balanceDue + 0.01 && (
        <div className="flex justify-between text-sm mt-2 px-2.5 py-1.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <span className="text-red-700 dark:text-red-400 font-medium">Over Payment</span>
          <span className="text-red-700 dark:text-red-400 font-semibold">{formatCurrency(Math.abs(remainingAmount))}</span>
        </div>
      )}
      {remainingAmount > 0.01 && allocatedTotal > 0 && allocatedTotal < balanceDue - 0.01 && (
        <div className="flex justify-between text-sm mt-2 px-2.5 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <span className="text-amber-700 dark:text-amber-400 font-medium">Remaining to pay</span>
          <span className="text-amber-700 dark:text-amber-400 font-semibold">{formatCurrency(remainingAmount)}</span>
        </div>
      )}
    </div>
  );
}

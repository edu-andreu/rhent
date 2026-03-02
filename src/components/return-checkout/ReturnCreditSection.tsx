import { Wallet, X, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { formatCurrencyARS } from "../../shared/format/currency";

interface ReturnCreditSectionProps {
  showCreditSection: boolean;
  creditApplied: number;
  customerCreditBalance: number;
  balanceDueBeforeCredit: number;
  tempCreditAmount: string;
  onShowSection: () => void;
  onHideSection: () => void;
  onTempValueChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onEdit?: () => void;
}

export function ReturnCreditSection({
  showCreditSection,
  creditApplied,
  customerCreditBalance,
  balanceDueBeforeCredit,
  tempCreditAmount,
  onShowSection,
  onHideSection,
  onTempValueChange,
  onApply,
  onCancel,
  onRemove,
  onEdit,
}: ReturnCreditSectionProps) {
  const formatCurrency = formatCurrencyARS;

  // Only show if customer has credit balance AND no surplus
  if (customerCreditBalance === 0) {
    return null;
  }

  // Show link when credit not applied
  if (!showCreditSection && creditApplied === 0) {
    return (
      <div>
        <button
          type="button"
          onClick={onShowSection}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{customerCreditBalance > 0 ? 'Apply store credit' : 'Apply store debit'}</span>
        </button>
      </div>
    );
  }

  // Editing Mode
  if (showCreditSection && creditApplied === 0) {
    return (
      <div className={`border rounded-lg p-3 space-y-2.5 ${
        customerCreditBalance > 0
          ? 'border-blue-300 dark:border-blue-700'
          : 'border-purple-300 dark:border-purple-700'
      }`}>
        <div className="flex items-center mb-1">
          <span className={`text-sm font-medium ${
            customerCreditBalance > 0
              ? 'text-blue-700 dark:text-blue-300'
              : 'text-purple-700 dark:text-purple-300'
          }`}>
            Apply {customerCreditBalance > 0 ? 'Store Credit' : 'Store Debit'}
          </span>
        </div>
        
        <div className={`text-xs mb-2 ${
          customerCreditBalance > 0
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-purple-600 dark:text-purple-400'
        }`}>
          {customerCreditBalance > 0 ? 'Store credit' : 'Store debit'}: {formatCurrency(Math.abs(customerCreditBalance))}
        </div>
        
        <div className="relative">
          <Input
            type="number"
            value={tempCreditAmount}
            onChange={(e) => onTempValueChange(e.target.value)}
            placeholder="0"
            min="0"
            max={customerCreditBalance < 0
              ? Math.abs(customerCreditBalance)
              : Math.min(Math.abs(customerCreditBalance), balanceDueBeforeCredit)
            }
            step="100"
            className="h-9 pr-7"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
            $
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            size="sm"
            className="flex-1 h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onApply}
            size="sm"
            className="flex-1 h-8"
            disabled={!tempCreditAmount || parseFloat(tempCreditAmount) <= 0}
          >
            Apply
          </Button>
        </div>
      </div>
    );
  }

  // Display Mode (when credit is applied)
  if (creditApplied !== 0) {
    return (
      <div className={`rounded-lg px-3 py-2 ${
        creditApplied > 0
          ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
          : 'bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className={`w-3.5 h-3.5 ${
              creditApplied > 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-purple-600 dark:text-purple-400'
            }`} />
            <div className="text-sm">
              <span className={`font-medium ${
                creditApplied > 0
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-purple-700 dark:text-purple-300'
              }`}>
                {creditApplied > 0 ? 'Store credit' : 'Store debit'} applied
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${
              creditApplied > 0
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-purple-700 dark:text-purple-300'
            }`}>
              -{formatCurrency(Math.abs(creditApplied))}
            </span>
            <button
              type="button"
              onClick={onEdit || (() => {
                // Edit button - restore to editing mode
                onShowSection();
              })}
              className={`transition-colors ${
                creditApplied > 0
                  ? 'text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400'
                  : 'text-purple-600 dark:text-purple-500 hover:text-purple-700 dark:hover:text-purple-400'
              }`}
              title={`Edit ${creditApplied > 0 ? 'store credit' : 'store debit'}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {creditApplied > 0 && customerCreditBalance > 0 && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Remaining credit: {formatCurrency(customerCreditBalance - creditApplied)}
          </div>
        )}
      </div>
    );
  }

  return null;
}

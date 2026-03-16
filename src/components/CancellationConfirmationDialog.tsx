import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { postFunction, getFunction } from "../shared/api/client";
import { handleApiError } from "../shared/utils/errorHandler";
import { formatCurrencyARS } from "../shared/format/currency";

interface CancellationConfirmationDialogProps {
  open: boolean;
  rentalItemId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancellationConfirmationDialog({
  open,
  rentalItemId,
  onClose,
  onConfirm,
}: CancellationConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(true);
  const [calculationData, setCalculationData] = useState<{
    totalPaid: number;
    itemOrderTotal: number;
    cancellationFeePercent: number;
    cancellationFeeAmount: number;
    creditAmount: number;
    itemStatus: string;
    itemCount: number;
    isOverdue: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Drawer validation state
  const [drawerStatus, setDrawerStatus] = useState<'open' | 'closed' | 'loading'>('loading');
  const [drawerBusinessDate, setDrawerBusinessDate] = useState<string | null>(null);

  useEffect(() => {
    if (open && rentalItemId) {
      calculateCancellation();
    }
  }, [open, rentalItemId]);

  const calculateCancellation = async () => {
    if (!rentalItemId) return;

    setCalculating(true);
    setError(null);
    setDrawerStatus('loading');

    try {
      const [data, drawerResponse] = await Promise.all([
        postFunction<{
          totalPaid: number;
          itemOrderTotal: number;
          cancellationFeePercent: number;
          cancellationFeeAmount: number;
          creditAmount: number;
          itemStatus: string;
          itemCount: number;
          isOverdue: boolean;
        }>("calculate-cancellation", { rentalItemId }),
        getFunction<{ status: string; business_date: string }>("drawer/current"),
      ]);
      
      // Validate that item status is 'reserved'
      if (data.itemStatus !== 'reserved') {
        setError(`Cannot cancel item with status '${data.itemStatus}'. Only items with status 'reserved' can be cancelled.`);
        setCalculationData(null);
      } else {
        setCalculationData(data);
      }
    } catch (err) {
      handleApiError(err, "cancellation calculation", "Failed to calculate cancellation");
      setError(err instanceof Error ? err.message : "Failed to calculate cancellation");
      setCalculationData(null);
    } finally {
      setCalculating(false);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!rentalItemId || !calculationData) return;

    setLoading(true);

    try {
      await postFunction("cancel-reservation", { rentalItemId });

      toast.success("Reservation cancelled successfully!");
      onConfirm();
    } catch (err) {
      handleApiError(err, "reservation cancellation", "Failed to cancel reservation");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = formatCurrencyARS;

  const isMultiItem = calculationData && calculationData.itemCount > 1;
  const creditIsPositive = calculationData && calculationData.creditAmount > 0;
  const creditIsNegative = calculationData && calculationData.creditAmount < 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Reservation</DialogTitle>
          <DialogDescription>
            Review the cancellation details below.{" "}
            {creditIsPositive
              ? "A credit will be added to the customer's account."
              : creditIsNegative
              ? "A debt will be recorded on the customer's account."
              : "No credit or debt will be applied."}
            {" A cancellation fee is applied according to your policy."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {calculating ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          ) : calculationData ? (
            <div className="space-y-3">
              {/* Item Order Total - the basis for the cancellation fee */}
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Item Order Total</span>
                <span className="text-base font-semibold">{formatCurrency(calculationData.itemOrderTotal)}</span>
              </div>

              {/* Total Paid (proportional for multi-item orders) */}
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Total Paid</span>
                  {isMultiItem && (
                    <span className="text-xs text-muted-foreground">proportional share</span>
                  )}
                </div>
                <span className="text-base font-semibold">{formatCurrency(calculationData.totalPaid)}</span>
              </div>

              {/* Cancellation Fee */}
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Cancellation Fee ({calculationData.cancellationFeePercent}%)</span>
                <span className="text-base font-semibold text-red-600 dark:text-red-400">
                  -{formatCurrency(calculationData.cancellationFeeAmount)}
                </span>
              </div>

              {/* Credit/Debt to Account */}
              <div className={`flex justify-between items-center p-3 border rounded-lg ${
                creditIsNegative
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  : "bg-primary/10 border-primary/20"
              }`}>
                <span className="text-sm font-semibold">
                  {creditIsNegative ? "Debt to Account" : "Credit to Account"}
                </span>
                <span className={`text-lg font-bold ${
                  creditIsNegative 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-primary"
                }`}>
                  {creditIsNegative 
                    ? `-${formatCurrency(Math.abs(calculationData.creditAmount))}`
                    : formatCurrency(calculationData.creditAmount)
                  }
                </span>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                {creditIsNegative
                  ? "This debt will be recorded as a negative balance on the customer's account"
                  : creditIsPositive
                  ? "This credit will be added to the customer's account balance"
                  : "No balance change — the cancellation fee equals the amount paid"
                }
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmCancellation}
            disabled={loading || calculating || !!error || !calculationData}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Confirm Cancellation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

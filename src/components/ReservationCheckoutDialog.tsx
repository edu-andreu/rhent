import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Loader2, ShoppingCart, Lock } from "lucide-react";
import { useReservationCheckout } from "./reservation-checkout/hooks/useReservationCheckout";
import { ReservationCheckoutCustomerInfo } from "./reservation-checkout/ReservationCheckoutCustomerInfo";
import { ReservationCheckoutItemDetails } from "./reservation-checkout/ReservationCheckoutItemDetails";
import { ReservationCheckoutDiscountSection } from "./reservation-checkout/ReservationCheckoutDiscountSection";
import { ReservationCheckoutSurplusSection } from "./reservation-checkout/ReservationCheckoutSurplusSection";
import { ReservationCheckoutTotals } from "./reservation-checkout/ReservationCheckoutTotals";
import { ReservationCheckoutPaymentSection } from "./reservation-checkout/ReservationCheckoutPaymentSection";
import { ReturnCreditSection } from "./return-checkout/ReturnCreditSection";
import { Wallet } from "lucide-react";

interface ReservationCheckoutDialogProps {
  open: boolean;
  rentalItemId: string | null;
  onClose: () => void;
  onConfirm: () => void;
  drawerError?: string | null;
  onClearDrawerError?: () => void;
}

export function ReservationCheckoutDialog({
  open,
  rentalItemId,
  onClose,
  onConfirm,
  drawerError,
  onClearDrawerError,
}: ReservationCheckoutDialogProps) {
  const hook = useReservationCheckout({ open, rentalItemId, drawerError, onConfirm, onClose });

  const { details, loading, processing, formatCurrency } = hook;
  const hasBalance = hook.hasBalance;
  const hasSurplus = hook.hasSurplus;
  const allocatedTotal = hook.allocatedTotal;
  const canConfirm = hook.canConfirm;

  return (
    <Dialog open={open} onOpenChange={hook.handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh]"
        aria-labelledby="reservation-checkout-dialog-title"
        aria-describedby="reservation-checkout-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="reservation-checkout-dialog-title" className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Checkout
          </DialogTitle>
          <DialogDescription id="reservation-checkout-dialog-description">
            Convert this reservation to an active rental and settle payment. Review the summary and confirm when ready.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !details ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load reservation details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ReservationCheckoutCustomerInfo customer={details.customer} />

              {/* Store credit banner: show when customer has credit so they're aware */}
              {hook.customerCreditBalance !== 0 && (
                <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${hook.customerCreditBalance > 0 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" : "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"}`}>
                  <Wallet className={`w-4 h-4 mt-0.5 flex-shrink-0 ${hook.customerCreditBalance > 0 ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`} />
                  <div>
                    <p className={`text-sm font-medium ${hook.customerCreditBalance > 0 ? "text-blue-700 dark:text-blue-300" : "text-purple-700 dark:text-purple-300"}`}>
                      {hook.customerCreditBalance > 0 ? `Store credit available: ${formatCurrency(hook.customerCreditBalance)}` : `Store debit: ${formatCurrency(Math.abs(hook.customerCreditBalance))}`}
                    </p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {hook.customerCreditBalance > 0 ? "You can apply it to this checkout below, or keep it for future rentals." : "It can be settled with this checkout below."}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <ReservationCheckoutItemDetails
                item={details.item}
                formatCurrency={formatCurrency}
                showExtraDaysSection={hook.showExtraDaysSection}
                applicableExtraDays={hook.applicableExtraDays}
                extraDaysAmount={hook.extraDaysAmount}
                extraDaysCount={hook.extraDaysCount}
                extraDayRate={hook.extraDayRate}
                originalExtraDaysCount={hook.originalExtraDaysCount}
                tempExtraDaysValue={hook.tempExtraDaysValue}
                onShowExtraDaysSection={() => {
                  hook.setTempExtraDaysValue("");
                  hook.setShowExtraDaysSection(true);
                }}
                onTempExtraDaysValueChange={hook.setTempExtraDaysValue}
                onApplyExtraDays={(days) => {
                  hook.setExtraDaysOverride(days);
                  hook.setShowExtraDaysSection(false);
                }}
                onCancelExtraDays={() => {
                  hook.setExtraDaysOverride(0);
                  hook.setTempExtraDaysValue("");
                  hook.setShowExtraDaysSection(false);
                }}
                onEditExtraDays={() => {
                  hook.setTempExtraDaysValue(hook.originalExtraDaysCount.toString());
                  hook.setShowExtraDaysSection(true);
                }}
                cancellationFeeAmount={hook.cancellationFeeAmount}
                originalCancellationFeeAmount={hook.originalCancellationFeeAmount}
                showCancellationFeeSection={hook.showCancellationFeeSection}
                tempCancellationFeeValue={hook.tempCancellationFeeValue}
                onCancellationFeeTempValueChange={hook.setTempCancellationFeeValue}
                onApplyCancellationFee={(amount) => {
                  hook.setCancellationFeeOverride(amount);
                  hook.setShowCancellationFeeSection(false);
                }}
                onRemoveCancellationFee={() => {
                  hook.setCancellationFeeOverride(0);
                  hook.setShowCancellationFeeSection(false);
                }}
                onEditCancellationFee={() => {
                  hook.setTempCancellationFeeValue(hook.cancellationFeeAmount.toString());
                  hook.setShowCancellationFeeSection(true);
                }}
                onCancelCancellationFeeEdit={() => {
                  hook.setShowCancellationFeeSection(false);
                }}
              />

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(hook.itemSubtotal)}</span>
                </div>

                <ReservationCheckoutDiscountSection
                  showDiscountSection={hook.showDiscountSection}
                  discountType={hook.discountType}
                  discountValue={hook.discountValue}
                  discountReason={hook.discountReason}
                  discountAmount={hook.discountAmount}
                  itemSubtotal={hook.itemSubtotal}
                  tempDiscountValue={hook.tempDiscountValue}
                  tempDiscountReason={hook.tempDiscountReason}
                  formatCurrency={formatCurrency}
                  onShowSection={() => hook.setShowDiscountSection(true)}
                  onDiscountTypeChange={hook.setDiscountType}
                  onTempDiscountValueChange={hook.setTempDiscountValue}
                  onTempDiscountReasonChange={hook.setTempDiscountReason}
                  onApplyDiscount={hook.handleApplyDiscount}
                  onCancelDiscount={hook.handleCancelDiscount}
                  onEditDiscount={hook.handleEditDiscount}
                />

                {hook.discountAmount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground font-medium">This item total</span>
                    <span className="font-semibold text-base">{formatCurrency(hook.itemTotal)}</span>
                  </div>
                )}
              </div>

              <ReservationCheckoutTotals
                itemTotal={hook.itemTotal}
                thisItemPaymentsTotal={hook.thisItemPaymentsTotal}
                orderGrandTotal={hook.orderGrandTotal}
                alreadyPaid={hook.alreadyPaid}
                balanceDue={hook.balanceDue}
                isMultiItemOrder={hook.isMultiItemOrder}
                creditApplied={hook.creditApplied}
                minimumRequired={hook.minimumRequired}
                rentDownPct={hook.rentDownPct}
                hasSurplus={hasSurplus}
                orderItems={hook.orderItems}
                currentRentalItemId={hook.currentRentalItemId}
                formatCurrency={formatCurrency}
              />

              {/* Store Credit / Outstanding Balance — show whenever customer has credit */}
              {hook.customerCreditBalance !== 0 && (
                <ReturnCreditSection
                  showCreditSection={hook.showCreditSection}
                  creditApplied={hook.creditApplied}
                  customerCreditBalance={hook.customerCreditBalance}
                  balanceDueBeforeCredit={hook.balanceDueBeforeCredit}
                  tempCreditAmount={hook.tempCreditAmount}
                  onShowSection={() => {
                    if (hook.customerCreditBalance < 0) {
                      hook.setTempCreditAmount(Math.abs(hook.customerCreditBalance).toString());
                    } else {
                      const maxApplicable = Math.min(Math.abs(hook.customerCreditBalance), hook.balanceDueBeforeCredit);
                      hook.setTempCreditAmount(maxApplicable.toString());
                    }
                    hook.setShowCreditSection(true);
                  }}
                  onHideSection={() => hook.setShowCreditSection(false)}
                  onTempValueChange={hook.setTempCreditAmount}
                  onApply={hook.handleApplyCredit}
                  onCancel={hook.handleCancelCredit}
                  onRemove={hook.handleRemoveCredit}
                  onEdit={hook.handleEditCredit}
                  fullyPaidMessage="This item is fully paid. Your store credit remains available for future rentals or returns."
                />
              )}

              {hasSurplus && (
                <ReservationCheckoutSurplusSection
                  surplus={hook.surplus}
                  surplusHandling={hook.surplusHandling}
                  refundMethodId={hook.refundMethodId}
                  paymentMethods={hook.paymentMethods}
                  formatCurrency={formatCurrency}
                  onSurplusHandlingChange={hook.setSurplusHandling}
                  onRefundMethodIdChange={hook.setRefundMethodId}
                />
              )}

              {hasBalance && (
                <>
                  <Separator />
                  <ReservationCheckoutPaymentSection
                    hasBalance={hasBalance}
                    paymentMethods={hook.paymentMethods}
                    balanceDue={hook.balanceDue}
                    allocatedTotal={hook.allocatedTotal}
                    remainingAmount={hook.remainingAmount}
                    minimumRequired={hook.minimumRequired}
                    rentDownPct={hook.rentDownPct}
                    creditApplied={hook.creditApplied}
                    formatCurrency={formatCurrency}
                    isMethodSelected={hook.isMethodSelected}
                    getMethodAmount={hook.getMethodAmount}
                    togglePaymentMethod={hook.togglePaymentMethod}
                    updatePaymentAmount={hook.updatePaymentAmount}
                  />
                  <Separator />
                </>
              )}

              {!hasBalance && !hasSurplus && details && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-center">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">Fully paid - no additional payment needed</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={hook.handleClose} disabled={processing} aria-label="Cancel reservation checkout and close dialog">
            Cancel
          </Button>
          <Button
            onClick={hook.handleConfirm}
            disabled={processing || loading || !details || !canConfirm}
            aria-busy={processing}
            aria-label={processing ? "Processing reservation payment" : hasBalance ? `Pay and rent for ${formatCurrency(allocatedTotal)}` : "Pay and rent"}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Processing...
              </>
            ) : (
              <>{hasBalance ? `Pay & Rent - ${formatCurrency(allocatedTotal > 0.01 ? allocatedTotal : hook.balanceDue)}` : "Pay & Rent"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog
        open={hook.showDrawerAlert}
        onOpenChange={(open) => {
          hook.setShowDrawerAlert(open);
          if (!open && onClearDrawerError) onClearDrawerError();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Cash Drawer Issue
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hook.drawerAlertMessage ||
                "You must open a cash drawer before processing any checkout. Please go to the Cash Drawer tab and open a drawer for today."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                hook.setShowDrawerAlert(false);
                if (onClearDrawerError) onClearDrawerError();
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

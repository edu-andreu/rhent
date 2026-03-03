import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Loader2, ShoppingCart, Lock } from "lucide-react";
import { useReservationCheckout } from "./reservation-checkout/hooks/useReservationCheckout";
import { ReservationCheckoutCustomerInfo } from "./reservation-checkout/ReservationCheckoutCustomerInfo";
import { ReservationCheckoutCreditBanner } from "./reservation-checkout/ReservationCheckoutCreditBanner";
import { ReservationCheckoutItemDetails } from "./reservation-checkout/ReservationCheckoutItemDetails";
import { ReservationCheckoutDiscountSection } from "./reservation-checkout/ReservationCheckoutDiscountSection";
import { ReservationCheckoutSurplusSection } from "./reservation-checkout/ReservationCheckoutSurplusSection";
import { ReservationCheckoutPaymentSection } from "./reservation-checkout/ReservationCheckoutPaymentSection";

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

              {hook.creditApplied !== 0 && (
                <ReservationCheckoutCreditBanner creditApplied={hook.creditApplied} formatCurrency={formatCurrency} />
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
              />

              <Separator />

              {/* Payment Summary */}
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

                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground font-medium">
                    {hook.isMultiItemOrder ? "This item total" : "Order total"}
                  </span>
                  <span className="font-semibold text-base">{formatCurrency(hook.itemTotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid for this item</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(hook.thisItemPaymentsTotal)}
                  </span>
                </div>

                {hook.isMultiItemOrder && (
                  <>
                    <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                      <span className="text-muted-foreground text-xs">Other items in this order</span>
                      <span className="text-muted-foreground text-xs">{formatCurrency(hook.otherItemsTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Order total</span>
                      <span className="font-semibold">{formatCurrency(hook.orderGrandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Already paid (order)</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(hook.alreadyPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Balance due</span>
                      <span className="font-semibold">{formatCurrency(hook.balanceDue)}</span>
                    </div>
                  </>
                )}

                {!hook.isMultiItemOrder && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Balance due</span>
                    <span className="font-semibold">{formatCurrency(hook.balanceDue)}</span>
                  </div>
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

                {hook.creditApplied !== 0 && !hasSurplus && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {hook.creditApplied > 0 ? "Store Credit Applied" : "Store Debit Added"}
                    </span>
                    <span
                      className={`font-semibold ${
                        hook.creditApplied > 0 ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"
                      }`}
                    >
                      {hook.creditApplied > 0 ? `-${formatCurrency(hook.creditApplied)}` : `+${formatCurrency(Math.abs(hook.creditApplied))}`}
                    </span>
                  </div>
                )}

                {hasBalance && hook.minimumRequired > 0 && hook.minimumRequired < hook.balanceDue && (
                  <div className="text-xs text-muted-foreground">
                    Minimum upfront payment: {formatCurrency(hook.minimumRequired)} ({hook.rentDownPct}% of total minus already paid{hook.creditApplied !== 0 ? " and credit applied" : ""})
                  </div>
                )}
              </div>

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

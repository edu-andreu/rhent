import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Loader2, ShoppingCart, Lock } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { formatCurrencyARS } from "../shared/format/currency";
import { useReturnCheckout } from "./return-checkout/hooks/useReturnCheckout";
import { ReturnCustomerInfo } from "./return-checkout/ReturnCustomerInfo";
import { ReturnItemDetails } from "./return-checkout/ReturnItemDetails";
import { ReturnCreditSection } from "./return-checkout/ReturnCreditSection";
import { ReturnPaymentSection } from "./return-checkout/ReturnPaymentSection";
import { ReturnSurplusHandlingSection } from "./return-checkout/ReturnSurplusHandlingSection";
import { ReturnDiscountSection } from "./return-checkout/ReturnDiscountSection";

interface ReturnCheckoutDialogProps {
  open: boolean;
  rentalItemId: string | null;
  onClose: () => void;
  onConfirm: () => void;
  drawerError?: string | null;
  onClearDrawerError?: () => void;
}

export function ReturnCheckoutDialog({
  open,
  rentalItemId,
  onClose,
  onConfirm,
  drawerError,
  onClearDrawerError,
}: ReturnCheckoutDialogProps) {
  const formatCurrency = formatCurrencyARS;

  const hook = useReturnCheckout({
    open,
    rentalItemId,
    drawerError,
    onConfirm,
    onClose,
  });

  const {
    returnDetails,
    paymentMethods,
    loading,
    processing,
    showDiscountSection,
    discountType,
    discountValue,
    discountReason,
    tempDiscountValue,
    tempDiscountReason,
    setShowDiscountSection,
    setDiscountType,
    setTempDiscountValue,
    setTempDiscountReason,
    handleApplyDiscount,
    handleCancelDiscount,
    handleEditDiscount,
    showExtraDaysSection,
    tempExtraDaysValue,
    applicableExtraDays,
    originalExtraDaysCount,
    extraDaysCount,
    extraDaysAmount,
    extraDayRate,
    setShowExtraDaysSection,
    setExtraDaysOverride,
    setTempExtraDaysValue,
    lateFeeApplied,
    lateFeeDays,
    showLateFeeSection,
    tempLateFeeDays,
    showLateFeeConfirm,
    applicableLateDays,
    lateDayRate,
    lateDaysPricePct,
    currentItemLateFee,
    setShowLateFeeSection,
    setTempLateFeeDays,
    setShowLateFeeConfirm,
    handleRemoveLateFee,
    handleApplyLateFee,
    handleCancelLateFee,
    handleEditLateFee,
    showCreditSection,
    creditApplied,
    setCreditApplied,
    tempCreditAmount,
    customerCreditBalance,
    setShowCreditSection,
    setTempCreditAmount,
    handleApplyCredit,
    handleCancelCredit,
    handleRemoveCredit,
    paymentAllocations,
    allocatedTotal,
    remainingAmount,
    togglePaymentMethod,
    updatePaymentAmount,
    isMethodSelected,
    getMethodAmount,
    showDrawerAlert,
    drawerAlertMessage,
    setShowDrawerAlert,
    surplusHandling,
    refundMethodId,
    hasSurplus,
    surplus,
    setSurplusHandling,
    setRefundMethodId,
    subtotal,
    totalExtraDays,
    discountAmount,
    grandTotal,
    paymentsTotal,
    balanceDue,
    balanceDueBeforeCredit,
    hasBalance,
    handleConfirm,
    handleClose,
    canConfirm,
  } = hook;

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Checkout
          </DialogTitle>
          <DialogDescription>
            Review the rental details and settle any outstanding balance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !returnDetails ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load return details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ReturnCustomerInfo customer={returnDetails.customer} />

              <ReturnItemDetails
                item={returnDetails.item}
                subtotal={subtotal}
                extraDays={{
                  showSection: showExtraDaysSection,
                  applicableDays: applicableExtraDays,
                  amount: extraDaysAmount,
                  count: extraDaysCount,
                  rate: extraDayRate,
                  originalCount: originalExtraDaysCount,
                  tempValue: tempExtraDaysValue,
                  onShow: () => {
                    setTempExtraDaysValue(originalExtraDaysCount > 0 ? originalExtraDaysCount.toString() : '');
                    setShowExtraDaysSection(true);
                  },
                  onTempChange: setTempExtraDaysValue,
                  onApply: (days) => {
                    setExtraDaysOverride(days);
                    setShowExtraDaysSection(false);
                  },
                  onCancel: () => {
                    setExtraDaysOverride(0);
                    setTempExtraDaysValue('');
                    setShowExtraDaysSection(false);
                  },
                }}
                lateFee={{
                  applied: lateFeeApplied,
                  days: lateFeeDays,
                  amount: currentItemLateFee,
                  applicableDays: applicableLateDays,
                  rate: lateDayRate,
                  pricePct: lateDaysPricePct,
                  showSection: showLateFeeSection,
                  tempDays: tempLateFeeDays,
                  suggestedDays: returnDetails?.lateFeeConfig?.suggestedLateDays,
                  onShow: () => {
                    const suggested = returnDetails?.lateFeeConfig?.suggestedLateDays || 0;
                    setTempLateFeeDays(suggested > 0 ? suggested.toString() : '1');
                    setShowLateFeeSection(true);
                  },
                  onTempChange: setTempLateFeeDays,
                  onApply: handleApplyLateFee,
                  onCancel: handleCancelLateFee,
                  onEdit: handleEditLateFee,
                  onRemove: handleRemoveLateFee,
                  onShowConfirm: () => setShowLateFeeConfirm(true),
                }}
              />

              <ReturnDiscountSection
                showDiscountSection={showDiscountSection}
                discountType={discountType}
                discountValue={discountValue}
                discountReason={discountReason}
                discountAmount={discountAmount}
                tempDiscountValue={tempDiscountValue}
                tempDiscountReason={tempDiscountReason}
                baseAmountForDiscount={subtotal + totalExtraDays}
                onShowSection={() => setShowDiscountSection(true)}
                onDiscountTypeChange={setDiscountType}
                onTempDiscountValueChange={setTempDiscountValue}
                onTempDiscountReasonChange={setTempDiscountReason}
                onApplyDiscount={handleApplyDiscount}
                onCancelDiscount={handleCancelDiscount}
                onEditDiscount={handleEditDiscount}
              />

              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground font-medium">Order Total</span>
                <span className="font-semibold text-base">{formatCurrency(grandTotal)}</span>
              </div>

              {/* Store Credit / Outstanding Balance — only show if customer has credit balance AND no surplus */}
              {customerCreditBalance !== 0 && !hasSurplus && (
                <ReturnCreditSection
                  showCreditSection={showCreditSection}
                  creditApplied={creditApplied}
                  customerCreditBalance={customerCreditBalance}
                  balanceDueBeforeCredit={balanceDueBeforeCredit}
                  tempCreditAmount={tempCreditAmount}
                  onShowSection={() => {
                    if (customerCreditBalance < 0) {
                      setTempCreditAmount(Math.abs(customerCreditBalance).toString());
                    } else {
                      const maxApplicable = Math.min(Math.abs(customerCreditBalance), balanceDueBeforeCredit);
                      setTempCreditAmount(maxApplicable.toString());
                    }
                    setShowCreditSection(true);
                  }}
                  onHideSection={() => setShowCreditSection(false)}
                  onTempValueChange={setTempCreditAmount}
                  onApply={handleApplyCredit}
                  onCancel={handleCancelCredit}
                  onRemove={handleRemoveCredit}
                  onEdit={() => {
                    setTempCreditAmount(Math.abs(creditApplied).toString());
                    setCreditApplied(0);
                    setShowCreditSection(true);
                  }}
                />
              )}

              <ReturnSurplusHandlingSection
                hasSurplus={hasSurplus}
                surplus={surplus}
                surplusHandling={surplusHandling}
                refundMethodId={refundMethodId}
                paymentMethods={paymentMethods}
                onSurplusHandlingChange={setSurplusHandling}
                onRefundMethodChange={setRefundMethodId}
              />

              <ReturnPaymentSection
                hasBalance={hasBalance}
                paymentMethods={paymentMethods}
                allocatedTotal={allocatedTotal}
                balanceDue={balanceDue}
                remainingAmount={remainingAmount}
                isMethodSelected={isMethodSelected}
                getMethodAmount={getMethodAmount}
                togglePaymentMethod={togglePaymentMethod}
                updatePaymentAmount={updatePaymentAmount}
              />

              {/* Bottom totals box */}
              <div className="bg-primary/10 p-3.5 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">Grand Total</span>
                  <span className="text-xl font-bold">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-semibold text-green-600">{formatCurrency(paymentsTotal)}</span>
                </div>
                {hasBalance && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/10 text-sm">
                    <span className="font-medium">Balance Due</span>
                    <span className="font-semibold">{formatCurrency(balanceDue)}</span>
                  </div>
                )}
                {!hasBalance && !hasSurplus && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Fully paid — no additional payment required
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || processing || loading || !returnDetails}
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : hasBalance ? (
              `Pay & Return - ${formatCurrency(allocatedTotal)}`
            ) : (
              'Confirm Return'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Late Fee Cancel Confirmation Dialog */}
    <AlertDialog open={showLateFeeConfirm} onOpenChange={setShowLateFeeConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            The late return charge will not be applied to this return. You can always re-apply it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleRemoveLateFee();
              setShowLateFeeConfirm(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove charge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Drawer Alert */}
    <AlertDialog open={showDrawerAlert} onOpenChange={(open) => {
      setShowDrawerAlert(open);
      if (!open && onClearDrawerError) {
        onClearDrawerError();
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-destructive" />
            Cash Drawer Issue
          </AlertDialogTitle>
          <AlertDialogDescription>
            {drawerAlertMessage || 'You must open a cash drawer before processing any checkout. Please go to the Cash Drawer tab and open a drawer for today.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => {
            setShowDrawerAlert(false);
            if (onClearDrawerError) {
              onClearDrawerError();
            }
          }}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

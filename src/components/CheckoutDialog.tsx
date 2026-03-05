import React from "react";
import { ShoppingCart, Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useCheckoutDialog, type CheckoutDialogProps } from "./checkout/useCheckoutDialog";
import { CheckoutCustomerSection } from "./checkout/CheckoutCustomerSection";
import { CheckoutOrderSummary } from "./checkout/CheckoutOrderSummary";
import { CheckoutDiscountSection } from "./checkout/CheckoutDiscountSection";
import { CheckoutPaymentSection } from "./checkout/CheckoutPaymentSection";
import { CheckoutTotals } from "./checkout/CheckoutTotals";

export type { CheckoutDialogProps };

export function CheckoutDialog(props: CheckoutDialogProps) {
  const ctx = useCheckoutDialog(props);

  return (
    <Dialog open={props.open} onOpenChange={ctx.handleClose}>
      <DialogContent id="checkout-dialog" data-testid="checkout-dialog" className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Checkout
          </DialogTitle>
          <DialogDescription>
            Review your order and complete payment
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <CheckoutCustomerSection
              selectedCustomer={ctx.selectedCustomer}
              setSelectedCustomer={ctx.setSelectedCustomer}
              customerSearchOpen={ctx.customerSearchOpen}
              setCustomerSearchOpen={ctx.setCustomerSearchOpen}
              customerSearchQuery={ctx.customerSearchQuery}
              setCustomerSearchQuery={ctx.setCustomerSearchQuery}
              customers={ctx.customers}
              customerCreditBalance={ctx.customerCreditBalance}
              onAddNewCustomer={ctx.onAddNewCustomer}
              onClose={ctx.handleClose}
              creditApplied={ctx.creditApplied}
              showCreditSection={ctx.showCreditSection}
              tempCreditAmount={ctx.tempCreditAmount}
              totalAfterDiscount={ctx.totalAfterDiscount}
              onShowCreditSection={() => {
                const max = ctx.customerCreditBalance > 0
                  ? Math.min(ctx.customerCreditBalance, ctx.totalAfterDiscount)
                  : Math.abs(ctx.customerCreditBalance);
                ctx.setTempCreditAmount(max.toString());
                ctx.setShowCreditSection(true);
              }}
              onHideCreditSection={() => ctx.setShowCreditSection(false)}
              onTempCreditAmountChange={ctx.setTempCreditAmount}
              onApplyCredit={ctx.handleApplyCredit}
              onCancelCredit={ctx.handleCancelCredit}
              onRemoveCredit={ctx.handleRemoveCredit}
              onEditCredit={ctx.handleEditCredit}
            />

            <CheckoutOrderSummary
              cartItems={ctx.cartItems}
              calcItems={ctx.calcResult.items}
              subtotal={ctx.subtotal}
              editingExtraDaysItemId={ctx.editingExtraDaysItemId}
              tempExtraDaysValue={ctx.tempExtraDaysValue}
              setTempExtraDaysValue={ctx.setTempExtraDaysValue}
              onEditItemExtraDays={ctx.handleEditItemExtraDays}
              onApplyItemExtraDays={ctx.handleApplyItemExtraDays}
              onRemoveItemExtraDays={ctx.handleRemoveItemExtraDays}
              onCancelItemExtraDays={ctx.handleCancelItemExtraDays}
            />

            <CheckoutDiscountSection
              showDiscountSection={ctx.showDiscountSection}
              setShowDiscountSection={ctx.setShowDiscountSection}
              discountType={ctx.discountType}
              setDiscountType={ctx.setDiscountType}
              discountValue={ctx.discountValue}
              discountAmount={ctx.discountAmount}
              discountReason={ctx.discountReason}
              tempDiscountValue={ctx.tempDiscountValue}
              setTempDiscountValue={ctx.setTempDiscountValue}
              tempDiscountReason={ctx.tempDiscountReason}
              setTempDiscountReason={ctx.setTempDiscountReason}
              subtotal={ctx.subtotal}
              handleApplyDiscount={ctx.handleApplyDiscount}
              handleCancelDiscount={ctx.handleCancelDiscount}
              handleRemoveDiscount={ctx.handleRemoveDiscount}
            />

            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground font-medium">Order Total</span>
              <span className="font-semibold text-base">{ctx.formatCurrency(ctx.total)}</span>
            </div>

            <CheckoutPaymentSection
              loading={ctx.loading}
              paymentMethods={ctx.paymentMethods}
              allocatedTotal={ctx.allocatedTotal}
              remainingAmount={ctx.remainingAmount}
              total={ctx.total}
              minimumRequired={ctx.minimumRequired}
              effectiveDownPaymentPctLabel={ctx.effectiveDownPaymentPctLabel}
              togglePaymentMethod={ctx.togglePaymentMethod}
              updatePaymentAmount={ctx.updatePaymentAmount}
              isMethodSelected={ctx.isMethodSelected}
              getMethodAmount={ctx.getMethodAmount}
            />

            <CheckoutTotals
              total={ctx.total}
              minimumRequired={ctx.minimumRequired}
              allocatedTotal={ctx.allocatedTotal}
              remainingAmount={ctx.remainingAmount}
              hasRentals={ctx.hasRentals}
              hasReservations={ctx.hasReservations}
              hasSales={ctx.hasSales}
              rentDownPaymentPct={ctx.rentDownPaymentPct}
              reservationDownPaymentPct={ctx.reservationDownPaymentPct}
              rentalSubtotal={ctx.rentalSubtotal}
              reservationSubtotal={ctx.reservationSubtotal}
              saleSubtotal={ctx.saleSubtotal}
              rentalMinimum={ctx.rentalMinimum}
              reservationMinimum={ctx.reservationMinimum}
              saleMinimum={ctx.saleMinimum}
            />
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button id="checkout-cancel-button" data-testid="checkout-cancel-button" variant="outline" onClick={ctx.handleClose} disabled={ctx.processing} aria-label="Cancel checkout and close dialog">
            Cancel
          </Button>
          <Button
            id="checkout-confirm-button"
            data-testid="checkout-confirm-button"
            onClick={ctx.handleConfirm}
            disabled={!ctx.selectedCustomer || !ctx.configLoaded || (ctx.total >= 0.01 && ctx.paymentAllocations.length === 0) || ctx.processing || ctx.allocatedTotal < ctx.minimumRequired - 0.01 || ctx.allocatedTotal > ctx.total + 0.01}
            size="lg"
            aria-busy={ctx.processing}
            aria-label={ctx.processing ? "Processing payment" : `Pay ${ctx.formatCurrency(ctx.allocatedTotal || 0)}`}
          >
            {ctx.processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Processing Payment...
              </>
            ) : (
              `Pay ${ctx.formatCurrency(ctx.allocatedTotal || 0)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={ctx.showDrawerAlert} onOpenChange={(open) => { ctx.setShowDrawerAlert(open); if (!open && ctx.onClearDrawerError) { ctx.onClearDrawerError(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Cash Drawer Issue
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ctx.drawerAlertMessage || 'You must open a cash drawer before processing any checkout. Please go to the Cash Drawer tab and open a drawer for today.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { ctx.setShowDrawerAlert(false); if (ctx.onClearDrawerError) { ctx.onClearDrawerError(); } }}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

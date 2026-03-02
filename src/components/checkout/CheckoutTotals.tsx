import React from "react";
import { Separator } from "../ui/separator";
import { formatCurrencyARS } from "../../shared/format/currency";

interface CheckoutTotalsProps {
  total: number;
  minimumRequired: number;
  allocatedTotal: number;
  remainingAmount: number;
  hasRentals: boolean;
  hasReservations: boolean;
  hasSales: boolean;
  rentDownPaymentPct: number;
  reservationDownPaymentPct: number;
  rentalSubtotal: number;
  reservationSubtotal: number;
  saleSubtotal: number;
  rentalMinimum: number;
  reservationMinimum: number;
  saleMinimum: number;
}

export function CheckoutTotals({
  total,
  minimumRequired,
  allocatedTotal,
  remainingAmount,
  hasRentals,
  hasReservations,
  hasSales,
  rentDownPaymentPct,
  reservationDownPaymentPct,
  rentalSubtotal,
  reservationSubtotal,
  saleSubtotal,
  rentalMinimum,
  reservationMinimum,
  saleMinimum,
}: CheckoutTotalsProps) {
  const formatCurrency = formatCurrencyARS;

  return (
    <>
      <Separator />

      <div className="bg-primary/10 p-3.5 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold">Total Amount</span>
          <span className="text-xl font-bold">{formatCurrency(total)}</span>
        </div>
        {minimumRequired < total && (
          <>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/10 text-sm text-muted-foreground">
              <span className="font-medium">Upfront amount required</span>
              <span className="font-semibold text-foreground">{formatCurrency(minimumRequired)}</span>
            </div>
            {[hasRentals, hasReservations, hasSales].filter(Boolean).length > 1 ? (
              <div className="mt-1.5 space-y-0.5">
                {hasRentals && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                    <span>Rentals — {rentDownPaymentPct}% of {formatCurrency(rentalSubtotal)}</span>
                    <span>{formatCurrency(rentalMinimum)}</span>
                  </div>
                )}
                {hasReservations && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                    <span>Reservations — {reservationDownPaymentPct}% of {formatCurrency(reservationSubtotal)}</span>
                    <span>{formatCurrency(reservationMinimum)}</span>
                  </div>
                )}
                {hasSales && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                    <span>Sales — 100% of {formatCurrency(saleSubtotal)}</span>
                    <span>{formatCurrency(saleMinimum)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-0.5 px-1">
                {hasRentals ? `${rentDownPaymentPct}% upfront payment for rentals` : hasReservations ? `${reservationDownPaymentPct}% upfront payment for reservations` : '100% upfront payment for sales'}
              </div>
            )}
          </>
        )}
        {allocatedTotal > 0 && remainingAmount > 0.01 && allocatedTotal >= minimumRequired - 0.01 && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/10 text-sm">
            <span className="font-medium">Balance Due</span>
            <span className="font-semibold">{formatCurrency(remainingAmount)}</span>
          </div>
        )}
      </div>
    </>
  );
}

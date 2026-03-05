interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  extraDaysAmount: number;
  discountAmount: number;
  status: string;
  isSale: boolean;
  paidTotal: number;
}

interface ReservationCheckoutTotalsProps {
  itemTotal: number;
  thisItemPaymentsTotal: number;
  orderGrandTotal: number;
  alreadyPaid: number;
  balanceDue: number;
  isMultiItemOrder: boolean;
  creditApplied: number;
  minimumRequired: number;
  rentDownPct: number;
  hasSurplus: boolean;
  orderItems: OrderItem[];
  currentRentalItemId: string;
  formatCurrency: (n: number) => string;
}

function getItemTypeLabel(item: OrderItem): string {
  if (item.isSale) return "Sale";
  if (item.status === "checked_out") return "Rental";
  return "Reservation";
}

export function ReservationCheckoutTotals({
  itemTotal,
  thisItemPaymentsTotal,
  orderGrandTotal,
  alreadyPaid,
  balanceDue,
  isMultiItemOrder,
  creditApplied,
  minimumRequired,
  rentDownPct,
  hasSurplus,
  orderItems,
  currentRentalItemId,
  formatCurrency,
}: ReservationCheckoutTotalsProps) {
  const orderTotal = isMultiItemOrder ? orderGrandTotal : itemTotal;
  const otherItems = orderItems.filter((oi) => oi.id !== currentRentalItemId);

  return (
    <div className="bg-primary/10 p-3.5 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="text-base font-semibold">Order Total</span>
        <span className="text-xl font-bold">{formatCurrency(orderTotal)}</span>
      </div>

      <div className="flex justify-between items-center mt-1.5 text-sm text-muted-foreground">
        <span>Already paid</span>
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(alreadyPaid)}
        </span>
      </div>

      {isMultiItemOrder && (
        <div className="mt-1.5 space-y-0.5">
          <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
            <span>This item</span>
            <span>paid {formatCurrency(thisItemPaymentsTotal)}</span>
          </div>
          {otherItems.map((oi) => {
            const label = getItemTypeLabel(oi);
            const oiTotal = oi.unitPrice + oi.extraDaysAmount - oi.discountAmount;
            return (
              <div key={oi.id} className="flex justify-between items-center text-xs text-muted-foreground px-1">
                <span>
                  {label}
                  <span className="mx-1 opacity-50">—</span>
                  {oi.name} {formatCurrency(oiTotal)}
                </span>
                <span>paid {formatCurrency(oi.paidTotal)}</span>
              </div>
            );
          })}
        </div>
      )}

      {creditApplied !== 0 && !hasSurplus && (
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/20 text-sm">
          <span className="text-muted-foreground">
            {creditApplied > 0 ? "Store Credit Applied" : "Store Debit Added"}
          </span>
          <span
            className={`font-semibold ${
              creditApplied > 0
                ? "text-green-600 dark:text-green-400"
                : "text-purple-600 dark:text-purple-400"
            }`}
          >
            {creditApplied > 0
              ? `-${formatCurrency(creditApplied)}`
              : `+${formatCurrency(Math.abs(creditApplied))}`}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/20">
        <span className="text-base font-semibold">Balance Due</span>
        <span className="text-xl font-bold">{formatCurrency(balanceDue)}</span>
      </div>

      {minimumRequired > 0 && minimumRequired < balanceDue && (
        <>
          <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
            <span className="font-medium">Minimum upfront required</span>
            <span className="font-semibold text-foreground">{formatCurrency(minimumRequired)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 px-1">
            {rentDownPct}% of balance due
          </div>
        </>
      )}
    </div>
  );
}

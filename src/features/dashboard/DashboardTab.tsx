import { Dashboard } from "../../components/Dashboard";
import { useDashboardData } from "./useDashboardData";
import type { Dress, Rental, Reservation } from "../../types";

interface DashboardTabProps {
  dresses: Dress[];
  rentals: Rental[];
  reservations: Reservation[];
}

export function DashboardTab({ dresses, rentals, reservations }: DashboardTabProps) {
  const {
    transactions,
    cashTransactions,
    openingBalance,
    paymentMethods,
    owners,
    vaultTransfers,
    loading,
  } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <Dashboard
        dresses={dresses}
        rentals={rentals}
        reservations={reservations}
        transactions={transactions}
        cashTransactions={cashTransactions}
        openingBalance={openingBalance}
        paymentMethods={paymentMethods}
        owners={owners}
        vaultTransfers={vaultTransfers}
      />
    </div>
  );
}

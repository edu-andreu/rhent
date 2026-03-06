import { Dashboard } from "../../components/Dashboard";
import type { Dress, Rental, Reservation } from "../../types";

interface DashboardTabProps {
  dresses: Dress[];
  rentals: Rental[];
  reservations: Reservation[];
}

export function DashboardTab({ dresses, rentals, reservations }: DashboardTabProps) {
  return (
    <div className="h-full overflow-y-auto">
      <Dashboard
        dresses={dresses}
        rentals={rentals}
        reservations={reservations}
        transactions={[]}
        cashTransactions={[]}
        openingBalance={0}
      />
    </div>
  );
}

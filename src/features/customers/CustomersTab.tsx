import { CustomerManager } from "../../components/CustomerManager";
import { Customer, Rental, Reservation } from "../../types";

interface CustomersTabProps {
  customers: Customer[];
  loadingCustomers: boolean;
  rentals: Rental[];
  reservations: Reservation[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onAddNew: () => void;
}

export function CustomersTab({
  customers,
  loadingCustomers,
  rentals,
  reservations,
  onEdit,
  onDelete,
  onAddNew,
}: CustomersTabProps) {
  if (loadingCustomers) {
    return (
      <div className="h-full flex justify-center items-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-4 text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <CustomerManager
        customers={customers}
        rentals={rentals}
        reservations={reservations}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddNew={onAddNew}
      />
    </div>
  );
}

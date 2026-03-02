import { MyRentals } from "../../components/MyRentals";
import { Rental } from "../../types";

interface RentalsTabProps {
  rentals: Rental[];
  onReturn: (rentalItemId: string) => void;
}

export function RentalsTab({ rentals, onReturn }: RentalsTabProps) {
  return (
    <div className="h-full">
      <MyRentals rentals={rentals} onReturn={onReturn} />
    </div>
  );
}

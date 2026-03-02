import { User, Phone } from "lucide-react";
import { Label } from "../ui/label";

interface Customer {
  name: string;
  phone?: string;
}

interface ReservationCheckoutCustomerInfoProps {
  customer: Customer | null;
}

export function ReservationCheckoutCustomerInfo({ customer }: ReservationCheckoutCustomerInfoProps) {
  return (
    <div>
      <Label className="mb-2 block font-semibold">
        <span className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          Customer
        </span>
      </Label>
      {customer ? (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{customer.name}</div>
              {customer.phone && (
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {customer.phone}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No customer associated</div>
      )}
    </div>
  );
}

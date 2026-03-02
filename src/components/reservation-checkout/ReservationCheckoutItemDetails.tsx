import { Sparkles, Calendar } from "lucide-react";
import { Badge } from "../ui/badge";
import { formatDateDisplay } from "../../shared/format/date";

interface Item {
  name: string;
  sku: string;
  size: string;
  colors: string[];
  imageUrl: string;
  unitPrice: number;
  startDate: string;
  endDate: string;
}

interface ReservationCheckoutItemDetailsProps {
  item: Item;
  formatCurrency: (n: number) => string;
}

export function ReservationCheckoutItemDetails({ item, formatCurrency }: ReservationCheckoutItemDetailsProps) {
  return (
    <div>
      <h3 className="mb-3">Reservation Item</h3>
      <div className="space-y-3">
        <div className="flex gap-3 p-3 bg-muted rounded-lg">
          <div className="w-20 h-20 flex-shrink-0">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded" />
            ) : (
              <div className="w-full h-full bg-muted-foreground/10 rounded flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{item.name}</p>
            {item.sku && (
              <p className="hidden text-[10px] text-muted-foreground/60 uppercase tracking-wide">{item.sku}</p>
            )}
            <div className="flex gap-1 mt-1 flex-wrap">
              {item.size && (
                <Badge variant="outline" className="text-xs">
                  Size {item.size}
                </Badge>
              )}
              {item.colors.map((color, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {color}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3" />
              <span>
                Reserved: {formatDateDisplay(item.startDate)} - {formatDateDisplay(item.endDate)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatCurrency(item.unitPrice)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

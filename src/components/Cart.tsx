import { ShoppingCart, Trash2, Calendar, X, Info, ShoppingBag } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { CartItem } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";
import { Alert, AlertDescription } from "./ui/alert";
import { Textarea } from "./ui/textarea";
import { memo, useState, useEffect, useRef } from "react";
import { formatCurrencyARS } from "../shared/format/currency";
import { formatDateObjectShort, formatDateObject } from "../shared/format/date";

const formatCurrency = formatCurrencyARS;

// Memoized cart item component to prevent re-renders when other items change
const CartItemCard = memo(({ 
  item, 
  onRemoveItem, 
  onUpdateItemNotes 
}: { 
  item: CartItem; 
  onRemoveItem: (itemId: string) => void; 
  onUpdateItemNotes?: (itemId: string, notes: string) => void;
}) => {
  // Local state for instant typing feedback
  const [localNotes, setLocalNotes] = useState(item.alterationNotes || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when item changes from outside
  useEffect(() => {
    setLocalNotes(item.alterationNotes || '');
  }, [item.alterationNotes]);

  // Handle textarea change with debounced update to parent
  const handleNotesChange = (value: string) => {
    // Update local state immediately for instant feedback
    setLocalNotes(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the parent state update
    debounceTimerRef.current = setTimeout(() => {
      onUpdateItemNotes?.(item.id, value);
    }, 300); // 300ms debounce
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Card className="flex flex-row overflow-hidden">
      {/* Smaller image on the left */}
      <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden bg-[#D5D7D5] m-3 rounded">
        <ImageWithFallback
          src={item.dress.imageUrl}
          alt={item.dress.name}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
      
      {/* Content on the right */}
      <div className="flex-1 py-3 pr-3 relative">
        {/* Remove button */}
        <Button
          data-testid={`cart-item-remove-${item.id}`}
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemoveItem(item.id)}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <h3 className="font-semibold text-sm mb-1.5 pr-8">{item.dress.name}</h3>
        <div className="space-y-1.5 text-xs">
          {/* Category and Type badges */}
          <div className="flex gap-1 flex-wrap">
            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              {item.dress.category}
            </Badge>
            {item.dress.type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.dress.type}</Badge>
            )}
          </div>
          
          {item.type === 'rental' && item.startDate && item.endDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="text-[11px]">
                Rented: {formatDateObjectShort(item.startDate)} - {formatDateObject(item.endDate)}
              </span>
            </div>
          )}

          {item.type === 'reservation' && item.startDate && item.endDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="text-[11px]">
                Reserved: {formatDateObjectShort(item.startDate)} - {formatDateObject(item.endDate)}
              </span>
            </div>
          )}

          {item.type === 'sale' && (
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ShoppingBag className="w-3 h-3" />
              <span className="text-[11px] font-medium">
                Sale {item.dress.isStockTracked ? '(Product)' : '(Service)'}
              </span>
            </div>
          )}

          {/* Alteration notes - only for reservations */}
          {item.type === 'reservation' && (
            <div className="mt-1.5">
              <Textarea
                placeholder="Notes to Modista..."
                value={localNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="text-xs min-h-[50px] resize-none"
              />
            </div>
          )}

          {/* Price breakdown */}
          <div className="mt-2 pt-1.5 border-t space-y-0.5">
            {item.standardPrice !== undefined && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Standard rent</span>
                <span className="font-medium">{formatCurrency(item.standardPrice)}</span>
              </div>
            )}
            {item.extraDays !== undefined && item.extraDays > 0 && item.extraDaysTotal !== undefined && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-amber-700">+{item.extraDays} extra {item.extraDays === 1 ? 'day' : 'days'}</span>
                <span className="font-medium text-amber-700">{formatCurrency(item.extraDaysTotal)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t">
              <span className="text-xs font-semibold">Total</span>
              <span className="text-base font-bold">{formatCurrency(item.amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

CartItemCard.displayName = 'CartItemCard';

interface CartProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  onUpdateItemNotes?: (itemId: string, notes: string) => void;
}

export function Cart({ open, onClose, items, onRemoveItem, onCheckout, onUpdateItemNotes }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const totalItems = items.length;

  const handleCheckout = () => {
    if (items.length > 0) {
      onCheckout();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent id="cart-sheet" data-testid="cart-sheet" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping Cart
            {totalItems > 0 && (
              <Badge variant="secondary" data-testid="cart-item-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your items before checkout
          </SheetDescription>
        </SheetHeader>

        <div id="cart-items" data-testid="cart-items" className="mt-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground">Add dresses to your cart to get started</p>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <CartItemCard 
                  key={item.id}
                  item={item}
                  onRemoveItem={onRemoveItem}
                  onUpdateItemNotes={onUpdateItemNotes}
                />
              ))}

              <Separator className="my-4" />

              <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold">{formatCurrency(total)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button
            id="cart-checkout-button"
            data-testid="cart-checkout-button"
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={items.length === 0}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Proceed to Checkout - {formatCurrency(total)}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

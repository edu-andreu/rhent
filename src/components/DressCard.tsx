import { useState, useCallback, useRef, useEffect, memo } from "react";
import { Calendar, Sparkles, Pencil, Trash2, Undo2, Loader2, ShoppingBag, Package } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dress } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface DressCardProps {
  dress: Dress;
  onRent?: (dress: Dress) => void;
  onReserve?: (dress: Dress) => void;
  onBuy?: (dress: Dress) => void;
  onEdit?: (dress: Dress) => void;
  onDelete?: (dress: Dress) => void;
  onMoveToShowroom?: (dress: Dress) => void;
  isMovingToShowroom?: boolean;
  defaultReturnLocationId?: string;
  editMode?: boolean;
  hideFooter?: boolean;
  hideAvailabilityBadge?: boolean;
}

export const DressCard = memo(function DressCard({ dress, onRent, onReserve, onBuy, onEdit, onDelete, onMoveToShowroom, isMovingToShowroom, defaultReturnLocationId, editMode = false, hideFooter = false, hideAvailabilityBadge = false }: DressCardProps) {
  // Brief processing animation state for action buttons
  const [processingAction, setProcessingAction] = useState<'rent' | 'reserve' | 'buy' | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleActionClick = useCallback((action: 'rent' | 'reserve' | 'buy', callback?: (dress: Dress) => void) => {
    if (processingAction || !callback) return;
    setProcessingAction(action);
    timeoutRef.current = setTimeout(() => {
      callback(dress);
      setProcessingAction(null);
    }, 400);
  }, [processingAction, dress]);

  // Extract background color from Tailwind class (e.g., "bg-[#198754]" -> "#198754")
  const getBgColor = (badgeClass?: string): string => {
    if (!badgeClass) return '#d1d5db'; // Default gray
    const match = badgeClass.match(/bg-\[(#[0-9A-Fa-f]{6})\]/);
    return match ? match[1] : '#d1d5db';
  };

  // Capitalize first letter of each word
  const capitalize = (text: string): string => {
    return text.replace(/\b\w/g, char => char.toUpperCase());
  };

  // Get availability badge color
  const getAvailabilityColor = (availabilityStatus?: string): string => {
    if (!availabilityStatus) return '#6b7280'; // Gray for unknown
    const lower = availabilityStatus.toLowerCase();
    // Check for unavailable first (before available) since it contains "available"
    if (lower.includes('unavailable') || lower === 'unavailable') return '#ef4444'; // Red
    if (lower.includes('available') || lower === 'available') return '#10b981'; // Green
    return '#6b7280'; // Gray for other
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#D5D7D5]">
          <ImageWithFallback
            src={dress.imageUrl}
            alt={dress.name}
            className="absolute inset-0 w-full h-full object-contain"
          />
          {!editMode && !hideAvailabilityBadge && dress.availabilityStatus && dress.availabilityStatus.toLowerCase().includes('unavailable') && (
            <div className="absolute inset-0 bg-black/50"></div>
          )}
          {/* Return to Showroom overlay on image */}
          {!editMode && !dress.isForSale && onMoveToShowroom && defaultReturnLocationId && dress.locationId === defaultReturnLocationId && (
            <button
              className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer z-10"
              onClick={() => onMoveToShowroom(dress)}
              disabled={isMovingToShowroom}
            >
              <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center shadow-lg">
                {isMovingToShowroom ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Undo2 className="w-6 h-6 text-white" />
                )}
              </div>
              <span className="text-white text-xs font-medium tracking-wide drop-shadow-sm">
                {isMovingToShowroom ? 'Processing...' : 'Return to Showroom'}
              </span>
            </button>
          )}
          {editMode ? (
            <span 
              className="text-white absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium opacity-90"
              style={{ backgroundColor: getBgColor(dress.statusBadgeClass) }}
            >
              {dress.status || (dress.available ? 'Available' : 'Rented')}
            </span>
          ) : (
            dress.availabilityStatus && !hideAvailabilityBadge && (
              <span 
                className="text-white absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium opacity-90"
                style={{ backgroundColor: getAvailabilityColor(dress.availabilityStatus) }}
              >
                {capitalize(dress.availabilityStatus)}
              </span>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Top section: name + categories + description (variable height) */}
        <div>
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-base font-semibold flex-1 truncate">{dress.name}</h3>
            <div className="flex gap-1.5 items-center shrink-0">
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{dress.category}</Badge>
              {dress.type && (
                <Badge variant="outline" className="text-xs">{dress.type}</Badge>
              )}
            </div>
          </div>
          {dress.sku && (
            <p className="hidden text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">{dress.sku}</p>
          )}
          <p className="text-muted-foreground text-xs mb-2 line-clamp-2 min-h-8">{dress.description}</p>
        </div>
        {/* Bottom section: badges + price + location (pushed to bottom for alignment) */}
        <div className="mt-auto space-y-1.5">
          <div className="flex gap-1.5 flex-wrap">
            {dress.brand && (
              <Badge variant="secondary" className="text-xs font-medium">{dress.brand}</Badge>
            )}
            <Badge variant="secondary" className="text-xs">{dress.size}</Badge>
            {dress.colors && dress.colors.map((color, index) => (
              <Badge key={index} variant="secondary" className="text-xs">{color}</Badge>
            ))}
          </div>
          {dress.isForSale ? (
            <>
              <p className="text-lg font-bold">${(dress.salePrice ?? 0).toLocaleString()}</p>
              {dress.isStockTracked && !editMode && (
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                  {dress.stockQuantity === 0 ? 'Out of stock' : `Stock: ${dress.stockQuantity}`}
                </p>
              )}
              {!dress.isStockTracked && !editMode && (
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Service</p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-bold">${dress.pricePerDay.toLocaleString()}</p>
              {!editMode && dress.status && (
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">{dress.status}</p>
              )}
            </>
          )}
        </div>
      </CardContent>
      {!hideFooter && (
        <CardFooter className="flex-col gap-2 p-3 pt-0 mt-auto">
          {editMode ? (
            <div className="flex gap-2 w-full">
              <Button
                data-testid={`dress-edit-button-${dress.id}`}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit?.(dress)}
              >
                <Pencil className="w-3 h-3 mr-1.5" />
                Edit
              </Button>
              <Button
                data-testid={`dress-delete-button-${dress.id}`}
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => onDelete?.(dress)}
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete
              </Button>
            </div>
          ) : dress.isForSale ? (
            /* Sale item: show Buy button only */
            <div className="flex gap-2 w-full">
              <Button
                data-testid={`dress-buy-button-${dress.id}`}
                size="sm"
                className="flex-1"
                onClick={() => handleActionClick('buy', onBuy)}
                disabled={(dress.isStockTracked && (dress.stockQuantity ?? 0) <= 0) || processingAction === 'buy'}
              >
                {processingAction === 'buy' ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3 h-3 mr-1.5" />
                    {dress.isStockTracked && (dress.stockQuantity ?? 0) <= 0 ? 'Out of Stock' : 'Buy'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Rental item: show Rent and Reserve buttons */
            <>
              <div className="flex gap-2 w-full">
                <Button
                  data-testid={`dress-rent-button-${dress.id}`}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleActionClick('rent', onRent)}
                  disabled={(!dress.availabilityStatus || dress.availabilityStatus.toLowerCase().includes('unavailable')) || processingAction === 'rent'}
                >
                  {processingAction === 'rent' ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      Rent
                    </>
                  )}
                </Button>
                <Button
                  data-testid={`dress-reserve-button-${dress.id}`}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleActionClick('reserve', onReserve)}
                  disabled={processingAction === 'reserve'}
                >
                  {processingAction === 'reserve' ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3 mr-1.5" />
                      Reserve
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
});
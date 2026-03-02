import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { PackageOpen, Calendar, User, Undo2, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Rental } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatDateObjectShort, formatDateObject } from "../shared/format/date";

interface MyRentalsProps {
  rentals: Rental[];
  onReturn: (rentalId: string) => void;
}

export const MyRentals = memo(function MyRentals({ rentals, onReturn }: MyRentalsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Memoize active rentals filter
  const activeRentals = useMemo(() => 
    rentals.filter(r => r.status === 'active'),
    [rentals]
  );

  // Memoize filtered rentals based on search query
  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activeRentals;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);

    return activeRentals.filter((rental) => {
      const searchableText = [
        rental.dressName,
        rental.sku || '',
        rental.category || '',
        rental.type || '',
        rental.brand || '',
        rental.size || '',
        rental.description || '',
        rental.customerName || '',
        ...(rental.colors || []),
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }, [activeRentals, searchQuery]);

  if (rentals.length === 0) {
    return (
      <div className="text-center py-12">
        <PackageOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="mb-2">No Rentals Yet</h3>
        <p className="text-muted-foreground">Start browsing the catalog to rent your first dress!</p>
      </div>
    );
  }

  const RentalCard = ({ rental, showReturn }: { rental: Rental; showReturn: boolean }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const handleReturnClick = useCallback(() => {
      if (isProcessing) return;
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => {
        onReturn(rental.id);
        setIsProcessing(false);
      }, 400);
    }, [isProcessing, rental.id]);

    // Check if rental is overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(rental.endDate);
    endDate.setHours(0, 0, 0, 0);
    const isOverdue = rental.status === 'active' && endDate < today;

    return (
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full ${rental.status === 'returned' ? 'opacity-60' : ''}`}>
        <CardHeader className="p-0">
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#D5D7D5]">
            <ImageWithFallback
              src={rental.dressImage}
              alt={rental.dressName}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {isOverdue && (
              <span 
                className="text-white absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium opacity-90"
                style={{ backgroundColor: '#ef4444' }}
              >
                Overdue
              </span>
            )}
          </div>
        </CardHeader>
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Top section: name + categories + description (variable height) */}
        <div>
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-base font-semibold flex-1 truncate">{rental.dressName}</h3>
            <div className="flex gap-1.5 items-center shrink-0">
              {rental.category && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{rental.category}</Badge>
              )}
              {rental.type && (
                <Badge variant="outline" className="text-xs">{rental.type}</Badge>
              )}
            </div>
          </div>
          {rental.sku && (
            <p className="hidden text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">{rental.sku}</p>
          )}
          <p className="text-muted-foreground text-xs mb-2 line-clamp-2 min-h-8">{rental.description || '\u00A0'}</p>
        </div>
        {/* Bottom section: badges + customer + dates (pushed to bottom for alignment) */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex gap-1.5 flex-wrap">
            {rental.brand && (
              <Badge variant="secondary" className="text-xs font-medium">{rental.brand}</Badge>
            )}
            {rental.size && (
              <Badge variant="secondary" className="text-xs">{rental.size}</Badge>
            )}
            {rental.colors && rental.colors.map((color, index) => (
              <Badge key={index} variant="secondary" className="text-xs">{color}</Badge>
            ))}
          </div>
          {/* Customer info */}
          {rental.customerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 mt-0.5 mb-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{rental.customerName}</span>
            </div>
          )}
          {/* Rental dates */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {formatDateObjectShort(rental.startDate)} - {formatDateObject(rental.endDate)}
            </span>
          </div>
          {/* Alteration notes */}
          {rental.alteration_notes && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
              <span className="font-medium">Notes: </span>
              {rental.alteration_notes}
            </div>
          )}
        </div>
      </CardContent>
      {showReturn && (
        <CardFooter className="gap-2 p-3 pt-0">
          <Button
            data-testid={`rental-return-button-${rental.id}`}
            size="sm"
            className="flex-1"
            onClick={handleReturnClick}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Undo2 className="w-3 h-3 mr-1.5" />
                Return
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
    );
  };

  const noResults = filteredActive.length === 0;

  return (
    <div id="rentals-tab" data-testid="rentals-tab" className="flex flex-col h-full">
      {/* Search Bar - Fixed/Static */}
      <div className="relative mb-6 flex-shrink-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="rentals-search"
          data-testid="rentals-search-input"
          type="text"
          placeholder="Search by name, SKU, category, brand, type, size, color, customer, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Content - Scrollable */}
      <div id="rentals-content" data-testid="rentals-content" className="flex-1 overflow-y-auto">
      {noResults ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No rentals found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredActive.map((rental) => (
            <RentalCard key={rental.id} rental={rental} showReturn={true} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
});
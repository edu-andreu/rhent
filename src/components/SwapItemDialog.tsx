import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Reservation, Dress } from "../types";
import { DressCard } from "./DressCard";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Loader2, Search, ArrowRight, Check, X, ArrowRightLeft, Info } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getFunction, postFunction, ApiError } from "../shared/api/client";
import { ERROR_MESSAGES } from "../shared/constants/errors";
import { handleApiError } from "../shared/utils/errorHandler";
import { formatDateLocal } from "../shared/utils/dateUtils";
import { formatCurrencyARS } from "../shared/format/currency";

interface SwapItemDialogProps {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SwapItemDialog({ reservation, open, onClose, onConfirm }: SwapItemDialogProps) {
  const [availableItems, setAvailableItems] = useState<Dress[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Dress | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available items when dialog opens
  useEffect(() => {
    if (!open || !reservation) {
      setAvailableItems([]);
      setSelectedItem(null);
      setSearchQuery("");
      setShowConfirmation(false);
      return;
    }

    const fetchAvailableItems = async () => {
      try {
        setLoadingItems(true);

        const startDate = reservation.startDate
          ? formatDateLocal(reservation.startDate)
          : formatDateLocal(reservation.reservationDate);
        const endDate = reservation.endDate
          ? formatDateLocal(reservation.endDate)
          : startDate;

        const params = new URLSearchParams({
          startDate,
          endDate,
          excludeItemId: reservation.dressId,
        });

        const data = await getFunction<{ items?: Dress[] }>(`available-items-for-dates?${params}`);
        setAvailableItems(data.items || []);
      } catch (error) {
        console.error('Error fetching available items:', error);
        toast.error('Failed to load available items');
        setAvailableItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchAvailableItems();
  }, [open, reservation]);

  const formatCurrency = formatCurrencyARS;

  // Multi-word search filter (same logic as Catalog)
  const filteredItems = availableItems.filter((item) => {
    if (!searchQuery.trim()) return true;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    const searchableText = [
      item.name,
      item.sku || '',
      item.category,
      item.type || '',
      item.brand || '',
      item.size,
      ...item.colors,
      item.description,
    ].join(' ').toLowerCase();

    return searchTerms.every(term => searchableText.includes(term));
  });

  const handleSelectItem = (item: Dress) => {
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const priceDifference = selectedItem && reservation
    ? selectedItem.pricePerDay - reservation.dressPricePerDay
    : 0;

  const handleSwapConfirm = async () => {
    if (!selectedItem || !reservation) return;

    setSubmitting(true);
    try {
      const result = await postFunction<{ priceDifference?: number }>(`rental-items/${reservation.id}/swap`, { newItemId: selectedItem.id });
      console.log('Swap successful:', result);

      // Show appropriate message based on price difference
      // Credit adjustments are now deferred to checkout (conversion or cancellation)
      if (result.priceDifference > 0) {
        toast.success(
          `Item swapped! Price increased by ${formatCurrency(result.priceDifference)} — difference will be settled at checkout.`
        );
      } else if (result.priceDifference < 0) {
        toast.success(
          `Item swapped! Price decreased by ${formatCurrency(Math.abs(result.priceDifference))} — overpayment will be handled at checkout.`
        );
      } else {
        toast.success('Item swapped successfully! Same price.');
      }

      setShowConfirmation(false);
      onConfirm();
    } catch (error) {
      console.error('❌ Swap error:', error);
      
      const errorData = error instanceof ApiError ? error.data : undefined;
      const errorObj = errorData && typeof errorData === 'object' && 'error' in errorData 
        ? (errorData as { error?: string; errorType?: string })
        : undefined;
      
      // Show more specific error messages for booking conflicts
      if (errorObj?.errorType === 'booking_conflict') {
        toast.error(errorObj.error || 'The selected item is already booked for these dates. Please choose a different item.', {
          duration: 5000,
        });
      } else {
        handleApiError(error, "item swap", "Failed to swap item");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setSelectedItem(null);
    setSearchQuery("");
    setShowConfirmation(false);
    onClose();
  };

  if (!reservation) return null;

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 space-y-4 border-b bg-background">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                  Swap Item
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                  Select a replacement for{' '}
                  <span className="font-medium text-foreground">{reservation.dressName}</span>
                </DialogDescription>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, SKU, category, brand, type, size, color or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-muted/40 border-muted-foreground/10 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Item Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            {loadingItems ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">Loading available items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-sm font-medium">
                  {searchQuery.trim()
                    ? `No items matching "${searchQuery}"`
                    : 'No items available for these dates'}
                </p>
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`cursor-pointer rounded-lg transition-all duration-200 relative ${
                        selectedItem?.id === item.id
                          ? 'ring-2 ring-primary ring-offset-2 shadow-lg'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <DressCard
                        dress={item}
                        editMode={false}
                        hideFooter
                        hideAvailabilityBadge
                      />
                      {selectedItem?.id === item.id && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md z-10">
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer with selection summary */}
          <div className="border-t bg-muted/20 px-6 py-4 space-y-3">
            {selectedItem ? (
              <div className="flex items-center gap-4">
                {/* Current -> New */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/40 shrink-0">
                      <ImageWithFallback
                        src={reservation.dressImage || ''}
                        alt={reservation.dressName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="text-sm font-medium truncate">{reservation.dressName}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/40 shrink-0">
                      <ImageWithFallback
                        src={selectedItem.imageUrl}
                        alt={selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">New</p>
                      <p className="text-sm font-medium truncate">{selectedItem.name}</p>
                    </div>
                  </div>
                </div>

                {/* Price badge - informational only */}
                <div className="shrink-0">
                  {priceDifference > 0 ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-xs font-semibold">
                      +{formatCurrency(priceDifference)}
                    </Badge>
                  ) : priceDifference < 0 ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-xs font-semibold">
                      {formatCurrency(priceDifference)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Same price
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Select an item to swap with
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirmation(true)}
                disabled={!selectedItem || loadingItems}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                Continue with Swap
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={(isOpen) => {
        if (!isOpen && !submitting) setShowConfirmation(false);
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Confirm Swap
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                {/* Swap visual */}
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <div className="flex-1 text-center space-y-2">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted/40 mx-auto">
                      <ImageWithFallback
                        src={reservation?.dressImage || ''}
                        alt={reservation?.dressName || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="text-sm font-medium text-foreground">{reservation?.dressName}</p>
                      <p className="text-sm text-foreground">{formatCurrency(reservation?.dressPricePerDay || 0)}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-center space-y-2">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted/40 mx-auto">
                      <ImageWithFallback
                        src={selectedItem?.imageUrl || ''}
                        alt={selectedItem?.name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">New</p>
                      <p className="text-sm font-medium text-foreground">{selectedItem?.name}</p>
                      <p className="text-sm text-foreground">{formatCurrency(selectedItem?.pricePerDay || 0)}</p>
                    </div>
                  </div>
                </div>

                {/* Price difference - informational */}
                {priceDifference > 0 && (
                  <div className="flex items-center gap-2.5 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-amber-800">
                      Price increases by <span className="font-bold">{formatCurrency(priceDifference)}</span>. Difference will be settled at rental checkout.
                    </span>
                  </div>
                )}

                {priceDifference < 0 && (
                  <div className="flex items-center gap-2.5 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800">
                      Price decreases by <span className="font-bold">{formatCurrency(Math.abs(priceDifference))}</span>. Credit will be added to customer account.
                    </span>
                  </div>
                )}

                {priceDifference === 0 && (
                  <div className="flex items-center gap-2.5 text-sm bg-muted/50 border rounded-lg p-3">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">No price difference between items.</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} onClick={() => setShowConfirmation(false)}>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSwapConfirm();
              }}
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Swap'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

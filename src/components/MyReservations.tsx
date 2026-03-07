import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { AlertTriangle, Calendar, CalendarClock, PackageOpen, Pencil, Search, Sparkles, Trash2, User, ArrowLeftRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Reservation } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { formatDateObjectShort, formatDateObject } from "../shared/format/date";
import { ReservationStats } from "./ReservationStats";
import { ReservationCheckoutDialog } from "./ReservationCheckoutDialog";
import { CancellationConfirmationDialog } from "./CancellationConfirmationDialog";
import { RescheduleReservationDialog } from "./RescheduleReservationDialog";
import { SwapItemDialog } from "./SwapItemDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { getCurrentDateGMT3 } from "../shared/utils/dateUtils";

interface MyReservationsProps {
  reservations: Reservation[];
  onCancel: (reservationId: string) => void;
  onReschedule: (reservationId: string, newDate: Date) => void;
  onConvertToRental: () => void;
  onConfirm: (reservationId: string) => void;
}

// Edit menu dropdown component
function EditMenu({ 
  onReschedule, 
  onSwap 
}: { 
  onReschedule: () => void; 
  onSwap: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative flex-1" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Pencil className="w-3 h-3 mr-1.5" />
        Edit
      </Button>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden w-max min-w-full">
          <button
            className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2 transition-colors whitespace-nowrap"
            onClick={() => {
              setIsOpen(false);
              onReschedule();
            }}
          >
            <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            Reschedule Dates
          </button>
          <button
            className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2 transition-colors border-t whitespace-nowrap"
            onClick={() => {
              setIsOpen(false);
              onSwap();
            }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            Swap Item
          </button>
        </div>
      )}
    </div>
  );
}

export const MyReservations = memo(function MyReservations({ 
  reservations, 
  onCancel, 
  onReschedule, 
  onConvertToRental,
  onConfirm 
}: MyReservationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [startDayFilter, setStartDayFilter] = useState<string>("next_30_days");
  const [convertRentalItemId, setConvertRentalItemId] = useState<string | null>(null);
  const [cancelRentalItemId, setCancelRentalItemId] = useState<string | null>(null);
  const [rescheduleReservation, setRescheduleReservation] = useState<Reservation | null>(null);
  const [swapReservation, setSwapReservation] = useState<Reservation | null>(null);

  // Start day filter: compute date range based on selected filter
  const filterByStartDay = useCallback((list: Reservation[]) => {
    if (startDayFilter === "all") return list;

    const today = getCurrentDateGMT3();
    let rangeStart: Date;
    let rangeEnd: Date;

    switch (startDayFilter) {
      case "today": {
        rangeStart = new Date(today);
        rangeEnd = new Date(today);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      case "tomorrow": {
        rangeStart = new Date(today);
        rangeStart.setDate(rangeStart.getDate() + 1);
        rangeEnd = new Date(rangeStart);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      case "this_week": {
        // Week starts on Monday
        const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        rangeStart = new Date(today);
        rangeStart.setDate(rangeStart.getDate() + mondayOffset);
        rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 6);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      case "next_week": {
        const dow = today.getDay();
        const monOffset = dow === 0 ? -6 : 1 - dow;
        rangeStart = new Date(today);
        rangeStart.setDate(rangeStart.getDate() + monOffset + 7);
        rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 6);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      case "this_month": {
        rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
        rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      case "next_30_days": {
        rangeStart = new Date(today);
        rangeEnd = new Date(today);
        rangeEnd.setDate(rangeEnd.getDate() + 30);
        rangeEnd.setHours(23, 59, 59, 999);
        break;
      }
      default:
        return list;
    }

    return list.filter((reservation) => {
      const startDate = reservation.startDate || reservation.reservationDate;
      if (!startDate) return false;
      if (startDate < today) return true;
      return startDate >= rangeStart && startDate <= rangeEnd;
    });
  }, [startDayFilter]);

  // Filter function (supports multi-word search like the catalog/rentals)
  const filterBySearch = useCallback((list: Reservation[]) => {
    if (!searchQuery.trim()) return list;

    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);

    return list.filter((reservation) => {
      const searchableText = [
        reservation.dressName,
        reservation.sku || '',
        reservation.category || '',
        reservation.type || '',
        reservation.brand || '',
        reservation.dressSize || '',
        reservation.description || '',
        reservation.customerName || '',
        ...(reservation.dressColors || []),
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }, [searchQuery]);

  // Memoize active reservations filter
  const activeReservations = useMemo(() => 
    reservations.filter(r => r.status !== 'cancelled'),
    [reservations]
  );

  // Memoize filtered reservations, sorting overdue first
  const filteredReservations = useMemo(() => {
    const filtered = filterBySearch(filterByStartDay(activeReservations));
    const today = getCurrentDateGMT3();
    return [...filtered].sort((a, b) => {
      const aStart = a.startDate || a.reservationDate;
      const bStart = b.startDate || b.reservationDate;
      const aOverdue = aStart && aStart < today ? 1 : 0;
      const bOverdue = bStart && bStart < today ? 1 : 0;
      return bOverdue - aOverdue;
    });
  }, [activeReservations, filterByStartDay, filterBySearch]);

  if (reservations.length === 0) {
    return (
      <div className="text-center py-12">
        <PackageOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="mb-2">No Reservations Yet</h3>
        <p className="text-muted-foreground">Reserve a dress for your upcoming event!</p>
      </div>
    );
  }

  const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const handleRentClick = useCallback(() => {
      if (isProcessing) return;
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => {
        setConvertRentalItemId(reservation.id);
        setIsProcessing(false);
      }, 400);
    }, [isProcessing, reservation.id]);

    const today = getCurrentDateGMT3();
    const startDate = reservation.startDate || reservation.reservationDate;
    const isOverdue = !!startDate && startDate < today;

    return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="p-0">
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#D5D7D5]">
          <ImageWithFallback
            src={reservation.dressImage}
            alt={reservation.dressName}
            className="absolute inset-0 w-full h-full object-contain"
          />
          {isOverdue && (
            <>
              <span
                className="text-white absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium opacity-90 z-20"
                style={{ backgroundColor: '#ef4444' }}
              >
                Overdue
              </span>
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 z-10 px-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-xs font-medium tracking-wide drop-shadow-sm text-center leading-tight">
                  Reschedule within 1 day or it will be auto-cancelled
                </span>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Top section: name + categories + description (variable height) */}
        <div>
          <div className="flex justify-between items-start gap-2 mb-1">
            <h3 className="text-base font-semibold flex-1 truncate">{reservation.dressName}</h3>
            <div className="flex gap-1.5 items-center shrink-0">
              {reservation.category && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">{reservation.category}</Badge>
              )}
              {reservation.type && (
                <Badge variant="outline" className="text-xs">{reservation.type}</Badge>
              )}
            </div>
          </div>
          {reservation.sku && (
            <p className="hidden text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">{reservation.sku}</p>
          )}
          <p className="text-muted-foreground text-xs mb-2 line-clamp-2 min-h-8">{reservation.description || '\u00A0'}</p>
        </div>
        {/* Bottom section: badges + customer + dates (pushed to bottom for alignment) */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex gap-1.5 flex-wrap">
            {reservation.brand && (
              <Badge variant="secondary" className="text-xs font-medium">{reservation.brand}</Badge>
            )}
            {reservation.dressSize && (
              <Badge variant="secondary" className="text-xs">{reservation.dressSize}</Badge>
            )}
            {reservation.dressColors && reservation.dressColors.map((color, index) => (
              <Badge key={index} variant="secondary" className="text-xs">{color}</Badge>
            ))}
          </div>
          {/* Customer info */}
          {reservation.customerName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 mt-0.5 mb-1.5">
              <User className="w-3.5 h-3.5" />
              <span>{reservation.customerName}</span>
            </div>
          )}
          {/* Reservation dates */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {reservation.startDate && reservation.endDate
                ? `${formatDateObjectShort(reservation.startDate)} - ${formatDateObject(reservation.endDate)}`
                : formatDateObject(reservation.reservationDate)
              }
            </span>
          </div>
          {/* Alteration notes */}
          {reservation.alteration_notes && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
              <span className="font-medium">Notes: </span>
              {reservation.alteration_notes}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="gap-2 p-3 pt-0 mt-auto">
        {editMode ? (
          <>
            <EditMenu
              onReschedule={() => setRescheduleReservation(reservation)}
              onSwap={() => setSwapReservation(reservation)}
            />
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setCancelRentalItemId(reservation.id)}
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="flex-1"
            onClick={handleRentClick}
            disabled={isProcessing}
          >
            {isProcessing ? (
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
        )}
      </CardFooter>
    </Card>
  );
  };

  const noResults = filteredReservations.length === 0;

  return (
    <div id="reservations-tab" data-testid="reservations-tab" className="flex flex-col h-full">
      {/* Stats and Header - Fixed/Static */}
      <div className="flex-shrink-0 space-y-6 mb-6">
        <ReservationStats reservations={reservations} />

        {/* Header with Search and Edit Mode Toggle */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-0 relative order-1 basis-full sm:basis-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reservations-search"
              data-testid="reservations-search-input"
              type="text"
              placeholder="Search by name, SKU, category, brand, type, size, color, customer, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Start Day Filter */}
          <Select value={startDayFilter} onValueChange={setStartDayFilter}>
            <SelectTrigger id="reservations-date-filter" data-testid="reservations-date-filter" className="w-[170px] h-11 shrink-0 order-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground mr-1.5" />
              <SelectValue placeholder="Start Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="next_week">Next Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="next_30_days">Next 30 Days</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>

          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-2 order-3">
            <Label htmlFor="reservations-edit-mode" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
              Edit Mode
            </Label>
            <Switch
              id="reservations-edit-mode"
              data-testid="reservations-edit-mode-toggle"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div id="reservations-content" data-testid="reservations-content" className="flex-1 overflow-y-auto">
      {noResults ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery.trim()
              ? `No reservations found matching "${searchQuery}"`
              : startDayFilter !== "all"
                ? `No reservations starting ${startDayFilter === "today" ? "today" : startDayFilter === "tomorrow" ? "tomorrow" : startDayFilter === "this_week" ? "this week" : startDayFilter === "next_week" ? "next week" : startDayFilter === "next_30_days" ? "in the next 30 days" : "this month"}`
                : "No active reservations"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredReservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      )}
      </div>

      {/* Reservation Checkout Dialog */}
      <ReservationCheckoutDialog
        open={!!convertRentalItemId}
        rentalItemId={convertRentalItemId}
        onClose={() => setConvertRentalItemId(null)}
        onConfirm={() => {
          setConvertRentalItemId(null);
          onConvertToRental();
        }}
      />

      {/* Cancellation Confirmation Dialog */}
      <CancellationConfirmationDialog
        open={!!cancelRentalItemId}
        rentalItemId={cancelRentalItemId}
        onClose={() => setCancelRentalItemId(null)}
        onConfirm={() => {
          setCancelRentalItemId(null);
          onConvertToRental(); // Refresh the list
        }}
      />

      {/* Reschedule Dialog */}
      <RescheduleReservationDialog
        reservation={rescheduleReservation}
        open={!!rescheduleReservation}
        onClose={() => setRescheduleReservation(null)}
        onConfirm={() => {
          setRescheduleReservation(null);
          onConvertToRental(); // Refresh the list
        }}
      />

      {/* Swap Item Dialog */}
      <SwapItemDialog
        reservation={swapReservation}
        open={!!swapReservation}
        onClose={() => setSwapReservation(null)}
        onConfirm={() => {
          setSwapReservation(null);
          onConvertToRental(); // Refresh the list
        }}
      />
    </div>
  );
});
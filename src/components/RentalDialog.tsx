import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Dress } from "../types";
import { Loader2, Calendar as CalendarIcon, Info } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Alert, AlertDescription } from "./ui/alert";
import { isWeekend, getCurrentDateGMT3, isHoliday, isDateReserved, shouldDisableDate, formatDateLocal } from "../shared/utils/dateUtils";
import { formatCurrencyARS } from "../shared/format/currency";
import { useHolidays } from "../shared/hooks/useHolidays";
import { useConfiguration } from "../shared/hooks/useConfiguration";
import { useBookingDates } from "../shared/hooks/useBookingDates";
import { calculatePricing } from "../shared/booking/pricing";
import { BookingCalendar, PricingSummary, HolidayAlert, ConflictAlertDialog } from "./booking";

interface RentalDialogProps {
  dress: Dress | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate: Date, extraDays?: number, totalAmount?: number, standardPrice?: number, extraDaysTotal?: number) => void;
}

export function RentalDialog({ dress, open, onClose, onConfirm }: RentalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { holidays, loading: loadingHolidays, error: holidayError } = useHolidays(open);
  const { config, loading: loadingConfig } = useConfiguration(open);
  const rentalDays = config.rentalDays;
  const extraDaysPrice = config.extraDaysPrice;

  const booking = useBookingDates({
    itemId: dress?.id || null,
    open,
    holidays,
    rentalDays,
  });

  const today = getCurrentDateGMT3();
  const todayIsWeekend = isWeekend(today);
  const todayIsHoliday = isHoliday(today, holidays);
  const todayIsReserved = isDateReserved(today, booking.reservedPeriods);
  const todayIsAvailable = !todayIsWeekend && !todayIsHoliday && !todayIsReserved;

  // A rental always starts today
  useEffect(() => {
    if (open && !loadingHolidays) {
      booking.setStartDate(getCurrentDateGMT3());
    }
  }, [open, loadingHolidays]);

  const handleEndDateChange = useCallback((date: Date | undefined) => {
    if (!date || !booking.startDate) return;
    if (date <= booking.startDate) {
      toast.error('Return date must be after start date');
      return;
    }
    booking.setEndDate(date);
  }, [booking]);

  const handleConfirm = async () => {
    if (!booking.startDate || !booking.endDate) return;

    const currentDate = getCurrentDateGMT3();
    const startDateStr = formatDateLocal(booking.startDate);
    const todayStr = formatDateLocal(currentDate);
    if (startDateStr !== todayStr) {
      toast.error('A rental can only start today. If you need a future start date, please create a reservation instead.');
      return;
    }

    if (!booking.validateDates()) return;

    setIsSubmitting(true);
    const currentPricing = calculatePricing(
      booking.startDate,
      booking.endDate,
      booking.autoCalculatedEndDate,
      rentalDays,
      dress?.pricePerDay || 0,
      extraDaysPrice,
      holidays
    );
    setIsSubmitting(false);
    onConfirm(booking.startDate, booking.endDate, currentPricing.extraDays, currentPricing.total, currentPricing.standardPrice, currentPricing.extraDaysTotal);
    booking.resetDates();
  };

  const handleClose = () => {
    booking.resetDates();
    onClose();
  };

  const pricing = useMemo(() => calculatePricing(
    booking.startDate,
    booking.endDate,
    booking.autoCalculatedEndDate,
    rentalDays,
    dress?.pricePerDay || 0,
    extraDaysPrice,
    holidays
  ), [booking.startDate, booking.endDate, booking.autoCalculatedEndDate, rentalDays, dress?.pricePerDay, extraDaysPrice, holidays]);

  if (!dress) return null;

  const isLoading = loadingConfig || loadingHolidays || booking.loadingAvailability;

  const endDateDisabled = (date: Date) => {
    if (!booking.startDate) return true;
    if (date <= booking.startDate) return true;
    return shouldDisableDate(date, {
      holidays,
      reservedPeriods: booking.reservedPeriods,
      bufferPeriods: booking.bufferPeriods,
      excludeWeekends: true,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-labelledby="rental-dialog-title"
          aria-describedby="rental-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="rental-dialog-title" className="text-xl">
              Rent {dress.name}
            </DialogTitle>
            <DialogDescription id="rental-dialog-description">
              Select the return date and review the pricing summary below. All required steps are indicated in the dialog content.
            </DialogDescription>
          </DialogHeader>

          {!isLoading && !todayIsAvailable && (
            <Alert variant="destructive" className="bg-red-50/80 border-red-200 py-2.5">
              <Info className="h-3.5 w-3.5" />
              <AlertDescription className="text-red-700 text-xs">
                Today is not an available day for renting. Create a reservation instead to book for a future date.
              </AlertDescription>
            </Alert>
          )}

          {holidayError && (
            <Alert variant="default" className="bg-amber-50/60 border-amber-200/60 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-500" />
              <AlertDescription className="text-muted-foreground text-xs">
                Holiday calendar unavailable. Dates calculated without holidays.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Start Date - Static display (rentals always start today) */}
            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Start Date <span className="text-xs font-normal text-muted-foreground">(today only)</span>
              </Label>
              <div className="flex justify-center flex-1">
                <div className="rounded-md border bg-muted/30 p-6 w-full flex flex-col items-center justify-center gap-1">
                  {booking.startDate ? (
                    <>
                      <span className="text-3xl font-bold">
                        {booking.startDate.toLocaleDateString('es-AR', { day: 'numeric' })}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground capitalize">
                        {booking.startDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize mt-1">
                        {booking.startDate.toLocaleDateString('es-AR', { weekday: 'long' })}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  )}
                </div>
              </div>
            </div>

            <BookingCalendar
              label="Return Date"
              selectedDate={booking.endDate}
              onSelect={handleEndDateChange}
              reservedDates={booking.reservedDates}
              bufferDates={booking.bufferDates}
              isDisabled={endDateDisabled}
            />
          </div>

          <HolidayAlert holidaysInPeriod={booking.holidaysInPeriod} />

          <PricingSummary
            pricing={pricing}
            itemName={dress.name}
            title="Rental Summary"
            extraDaysPricePercent={extraDaysPrice}
            isLoading={isLoading}
            hasDates={!!(booking.startDate && booking.endDate)}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} aria-label="Cancel rental and close dialog">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!booking.startDate || !booking.endDate || isLoading || !todayIsAvailable || isSubmitting}
              aria-busy={isSubmitting || isLoading}
              aria-label={
                isSubmitting ? "Processing rental"
                  : isLoading ? "Loading rental details"
                  : `Confirm rental for ${formatCurrencyARS(pricing.total)}`
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Processing...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Loading...
                </>
              ) : (
                <>Confirm - {formatCurrencyARS(pricing.total)}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConflictAlertDialog conflictAlert={booking.conflictAlert} onDismiss={booking.dismissConflictAlert} />
    </>
  );
}

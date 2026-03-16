import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Dress } from "../types";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { formatCurrencyARS } from "../shared/format/currency";
import { useHolidays } from "../shared/hooks/useHolidays";
import { useConfiguration } from "../shared/hooks/useConfiguration";
import { useBookingDates } from "../shared/hooks/useBookingDates";
import { calculatePricing } from "../shared/booking/pricing";
import { shouldDisableDate, getCurrentDateGMT3 } from "../shared/utils/dateUtils";
import { BookingCalendar, PricingSummary, HolidayAlert, ConflictAlertDialog } from "./booking";
import { toast } from "sonner@2.0.3";

interface ReservationDialogProps {
  dress: Dress | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate: Date, extraDays?: number, totalAmount?: number, standardPrice?: number, extraDaysTotal?: number) => void;
}

export function ReservationDialog({ dress, open, onClose, onConfirm }: ReservationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startMonth, setStartMonth] = useState<Date>(new Date());
  const [endMonth, setEndMonth] = useState<Date>(new Date());

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

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    booking.setStartDate(date);
  }, [booking]);

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

  const pricing = calculatePricing(
    booking.startDate,
    booking.endDate,
    booking.autoCalculatedEndDate,
    rentalDays,
    dress?.pricePerDay || 0,
    extraDaysPrice,
    holidays
  );

  if (!dress) return null;

  const isLoading = loadingConfig || loadingHolidays || booking.loadingAvailability;

  const startDateDisabled = (date: Date) => {
    const today = getCurrentDateGMT3();
    if (date <= today) return true;
    return shouldDisableDate(date, {
      holidays,
      reservedPeriods: booking.reservedPeriods,
      bufferPeriods: booking.bufferPeriods,
      excludeWeekends: true,
    });
  };

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
          aria-labelledby="reservation-dialog-title"
          aria-describedby="reservation-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="reservation-dialog-title" className="text-xl">
              Reserve {dress.name}
            </DialogTitle>
            <DialogDescription id="reservation-dialog-description">
              Select reservation start and return dates and review the pricing summary below. Weekends and holidays are disabled.
            </DialogDescription>
          </DialogHeader>

          {holidayError && (
            <Alert variant="default" className="bg-amber-50/60 border-amber-200/60 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-500" />
              <AlertDescription className="text-muted-foreground text-xs">
                Holiday calendar unavailable. Dates calculated without holidays.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <BookingCalendar
              label="Start Date"
              selectedDate={booking.startDate}
              onSelect={handleStartDateChange}
              month={startMonth}
              onMonthChange={setStartMonth}
              reservedDates={booking.reservedDates}
              bufferDates={booking.bufferDates}
              isDisabled={startDateDisabled}
            />
            <BookingCalendar
              label="Return Date"
              selectedDate={booking.endDate}
              onSelect={handleEndDateChange}
              month={endMonth}
              onMonthChange={setEndMonth}
              reservedDates={booking.reservedDates}
              bufferDates={booking.bufferDates}
              isDisabled={endDateDisabled}
            />
          </div>

          <HolidayAlert holidaysInPeriod={booking.holidaysInPeriod} />

          <PricingSummary
            pricing={pricing}
            itemName={dress.name}
            title="Reservation Summary"
            extraDaysPricePercent={extraDaysPrice}
            isLoading={isLoading}
            hasDates={!!(booking.startDate && booking.endDate)}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} aria-label="Cancel reservation and close dialog">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!booking.startDate || !booking.endDate || isLoading || isSubmitting}
              aria-busy={isSubmitting || isLoading}
              aria-label={
                isSubmitting ? "Processing reservation"
                  : isLoading ? "Loading reservation details"
                  : `Confirm reservation for ${formatCurrencyARS(pricing.total)}`
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

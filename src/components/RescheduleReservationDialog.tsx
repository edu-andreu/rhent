import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Reservation } from "../types";
import { Loader2, Calendar as CalendarIcon, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { postFunction, ApiError } from "../shared/api/client";
import { ERROR_MESSAGES } from "../shared/constants/errors";
import { handleApiError } from "../shared/utils/errorHandler";
import { Alert, AlertDescription } from "./ui/alert";
import { getCurrentDateGMT3, shouldDisableDate, formatDateLocal } from "../shared/utils/dateUtils";
import { formatCurrencyARS } from "../shared/format/currency";
import { useHolidays } from "../shared/hooks/useHolidays";
import { useConfiguration } from "../shared/hooks/useConfiguration";
import { useBookingDates } from "../shared/hooks/useBookingDates";
import { calculatePricing } from "../shared/booking/pricing";
import { BookingCalendar, PricingSummary, HolidayAlert, ConflictAlertDialog } from "./booking";

interface RescheduleReservationDialogProps {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RescheduleReservationDialog({ reservation, open, onClose, onConfirm }: RescheduleReservationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [startMonth, setStartMonth] = useState<Date | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<Date | undefined>(undefined);

  const { holidays, loading: loadingHolidays, error: holidayError } = useHolidays(open);
  const { config, loading: loadingConfig } = useConfiguration(open);
  const rentalDays = config.rentalDays;
  const extraDaysPrice = config.extraDaysPrice;

  const booking = useBookingDates({
    itemId: reservation?.dressId || null,
    open,
    holidays,
    rentalDays,
    excludeItemId: reservation?.id,
    initialStartDate: reservation?.startDate,
    initialEndDate: reservation?.endDate,
  });

  // Sync calendar months with initial reservation dates
  useEffect(() => {
    if (open && reservation) {
      setStartMonth(reservation.startDate);
      setEndMonth(reservation.endDate);
      setHasConflict(false);
    } else {
      setStartMonth(undefined);
      setEndMonth(undefined);
      setHasConflict(false);
    }
  }, [open, reservation]);

  // Update end month when auto-calculated end date changes
  useEffect(() => {
    if (booking.autoCalculatedEndDate) {
      setEndMonth(booking.autoCalculatedEndDate);
    }
  }, [booking.autoCalculatedEndDate]);

  // Check for conflicts whenever dates change
  useEffect(() => {
    if (!booking.startDate || !booking.endDate) {
      setHasConflict(false);
      return;
    }
    const startStr = formatDateLocal(booking.startDate);
    const endStr = formatDateLocal(booking.endDate);
    const conflict = booking.reservedDates.some(rd => {
      const rdStr = formatDateLocal(rd);
      return rdStr >= startStr && rdStr <= endStr;
    });
    setHasConflict(conflict);
  }, [booking.startDate, booking.endDate, booking.reservedDates]);

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    booking.setStartDate(date);
    if (date) setStartMonth(date);
  }, [booking]);

  const handleEndDateChange = useCallback((date: Date | undefined) => {
    if (!date || !booking.startDate) return;
    if (date <= booking.startDate) {
      toast.error('Return date must be after start date');
      return;
    }
    booking.setEndDate(date);
    setEndMonth(date);
  }, [booking]);

  const pricing = calculatePricing(
    booking.startDate,
    booking.endDate,
    booking.autoCalculatedEndDate,
    rentalDays,
    reservation?.dressPricePerDay || 0,
    extraDaysPrice,
    holidays
  );

  const handleConfirm = async () => {
    if (!booking.startDate || !booking.endDate || !reservation) return;
    if (!booking.validateDates({ excludeReservationId: reservation.id })) return;

    const newStartStr = formatDateLocal(booking.startDate);
    const newEndStr = formatDateLocal(booking.endDate);

    setIsSubmitting(true);
    try {
      const result = await postFunction<{ priceDifference?: number }>(`rental-items/${reservation.id}/reschedule`, {
        newStartDate: newStartStr,
        newEndDate: newEndStr,
      });

      if (result.priceDifference !== 0) {
        const direction = result.priceDifference! > 0 ? 'increased' : 'decreased';
        toast.success(`Reservation rescheduled! Price ${direction} by ${formatCurrencyARS(Math.abs(result.priceDifference!))} — difference will be settled at rental checkout.`);
      } else {
        toast.success('Reservation rescheduled successfully!');
      }

      onConfirm();
    } catch (error) {
      console.error('Error rescheduling:', error);
      const errorData = error instanceof ApiError ? error.data : undefined;
      const errorObj = errorData && typeof errorData === 'object' && 'error' in errorData
        ? (errorData as { error?: string; errorType?: string })
        : undefined;

      if (errorObj?.errorType === 'booking_conflict') {
        toast.error(errorObj.error || ERROR_MESSAGES.BOOKING_CONFLICT, { duration: 5000 });
      } else {
        handleApiError(error, "reservation", "Failed to reschedule reservation");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    booking.resetDates();
    onClose();
  };

  if (!reservation) return null;

  const isLoading = loadingConfig || loadingHolidays || booking.loadingAvailability;
  const oldStartDate = reservation.startDate;
  const oldEndDate = reservation.endDate;

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
          aria-labelledby="reschedule-dialog-title"
          aria-describedby="reschedule-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="reschedule-dialog-title" className="text-xl">
              Reschedule {reservation.dressName}
            </DialogTitle>
            <DialogDescription id="reschedule-dialog-description">
              {reservation.sku && <span className="hidden font-mono text-xs">{reservation.sku}</span>}
              {reservation.sku && " - "}Select new dates for this reservation and review the updated price summary.
            </DialogDescription>
          </DialogHeader>

          {/* Current Reservation Info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium">Current Reservation</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>
                {oldStartDate
                  ? oldStartDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'N/A'}
                {' - '}
                {oldEndDate
                  ? oldEndDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'N/A'}
              </span>
            </div>
            {reservation.customerName && (
              <p className="text-xs text-muted-foreground">Customer: {reservation.customerName}</p>
            )}
          </div>

          {holidayError && (
            <Alert variant="default" className="bg-amber-50/60 border-amber-200/60 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-500" />
              <AlertDescription className="text-muted-foreground text-xs">
                Holiday calendar unavailable. Dates calculated without holidays.
              </AlertDescription>
            </Alert>
          )}

          {hasConflict && (
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Date conflict: This item is already booked for some of the selected dates.
                Please choose different dates.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BookingCalendar
              label="New Start Date"
              selectedDate={booking.startDate}
              onSelect={handleStartDateChange}
              month={startMonth}
              onMonthChange={setStartMonth}
              reservedDates={booking.reservedDates}
              bufferDates={booking.bufferDates}
              isDisabled={startDateDisabled}
              className="min-w-0"
            />
            <BookingCalendar
              label="New Return Date"
              selectedDate={booking.endDate}
              onSelect={handleEndDateChange}
              month={endMonth}
              onMonthChange={setEndMonth}
              reservedDates={booking.reservedDates}
              bufferDates={booking.bufferDates}
              isDisabled={endDateDisabled}
              className="min-w-0"
            />
          </div>

          <HolidayAlert holidaysInPeriod={booking.holidaysInPeriod} />

          <PricingSummary
            pricing={pricing}
            itemName={reservation.dressName}
            title="Price Summary"
            isLoading={isLoading}
            hasDates={!!(booking.startDate && booking.endDate)}
          >
            {/* Price comparison */}
            {reservation.dressPricePerDay && pricing.total !== reservation.dressPricePerDay && (
              <>
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-muted-foreground">Price change</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground">{formatCurrencyARS(reservation.dressPricePerDay)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className={pricing.total > reservation.dressPricePerDay ? 'text-amber-700 font-medium' : 'text-green-700 font-medium'}>
                      {formatCurrencyARS(pricing.total)}
                    </span>
                    <Badge variant={pricing.total > reservation.dressPricePerDay ? 'destructive' : 'default'} className="text-xs">
                      {pricing.total > reservation.dressPricePerDay ? '+' : ''}{formatCurrencyARS(pricing.total - reservation.dressPricePerDay)}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </PricingSummary>

          {/* Settlement info note */}
          {pricing.total !== reservation.dressPricePerDay && booking.startDate && booking.endDate && !isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {pricing.total > (reservation.dressPricePerDay || 0)
                  ? 'The additional charge will be settled at rental checkout.'
                  : 'The price difference will be settled at rental checkout.'}
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting} aria-label="Cancel reschedule and close dialog">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!booking.startDate || !booking.endDate || isLoading || isSubmitting || hasConflict}
              aria-busy={isSubmitting}
              aria-label={isSubmitting ? "Rescheduling reservation" : "Confirm reschedule"}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Rescheduling...
                </>
              ) : (
                'Confirm Reschedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConflictAlertDialog conflictAlert={booking.conflictAlert} onDismiss={booking.dismissConflictAlert} />
    </>
  );
}

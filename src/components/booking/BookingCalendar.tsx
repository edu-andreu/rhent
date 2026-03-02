import { Calendar } from "../ui/calendar";
import { Label } from "../ui/label";
import { Calendar as CalendarIcon } from "lucide-react";

const RESERVED_MODIFIER_STYLE = {
  color: '#ef4444',
  opacity: 0.75,
  fontWeight: 500,
  backgroundColor: 'rgba(239, 68, 68, 0.08)',
  borderRadius: '6px',
} as const;

const BUFFER_MODIFIER_STYLE = {
  color: '#3b82f6',
  opacity: 0.75,
  fontWeight: 500,
  backgroundColor: 'rgba(59, 130, 246, 0.08)',
  borderRadius: '6px',
} as const;

interface BookingCalendarProps {
  label: string;
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  reservedDates: Date[];
  bufferDates: Date[];
  isDisabled: (date: Date) => boolean;
  className?: string;
}

export function BookingCalendar({
  label,
  selectedDate,
  onSelect,
  month,
  onMonthChange,
  reservedDates,
  bufferDates,
  isDisabled,
  className,
}: BookingCalendarProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label className="text-sm font-semibold flex items-center gap-2">
        <CalendarIcon className="w-4 h-4" />
        {label}
      </Label>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          month={month}
          onMonthChange={onMonthChange}
          disabled={isDisabled}
          modifiers={{ reserved: reservedDates, buffer: bufferDates }}
          modifiersStyles={{
            reserved: RESERVED_MODIFIER_STYLE,
            buffer: BUFFER_MODIFIER_STYLE,
          }}
          className="rounded-md border"
        />
      </div>
      {selectedDate && (
        <p className="text-xs text-center text-muted-foreground">
          {selectedDate.toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}

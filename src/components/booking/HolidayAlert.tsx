import { Alert, AlertDescription } from "../ui/alert";
import { Info } from "lucide-react";
import { Holiday } from "../../shared/utils/dateUtils";

interface HolidayAlertProps {
  holidaysInPeriod: Holiday[];
}

export function HolidayAlert({ holidaysInPeriod }: HolidayAlertProps) {
  if (holidaysInPeriod.length === 0) return null;

  return (
    <Alert variant="default" className="bg-amber-50/60 border-amber-200/60 py-2.5">
      <Info className="h-3.5 w-3.5 text-amber-500" />
      <AlertDescription className="text-amber-700 text-xs">
        <p>
          Return date adjusted for {holidaysInPeriod.length}{" "}
          {holidaysInPeriod.length === 1 ? "holiday" : "holidays"}:{" "}
          {holidaysInPeriod
            .map((holiday, idx) => {
              const formatted = new Date(holiday.date)
                .toLocaleDateString("es-AR", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
                .replace(",", "");
              return idx < holidaysInPeriod.length - 1
                ? formatted + "; "
                : formatted;
            })
            .join("")}
        </p>
      </AlertDescription>
    </Alert>
  );
}

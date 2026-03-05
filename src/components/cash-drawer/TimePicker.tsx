import React, { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const MINUTES = ["00", "15", "30", "45"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  "aria-label"?: string;
}

export function TimePicker({ value, onChange, id, "aria-label": ariaLabel }: TimePickerProps) {
  const normalized = value && /^\d{1,2}:\d{2}$/.test(value) ? value : "09:00";
  const [hour, minute] = normalized.split(":");
  const minuteOption = MINUTES.includes(minute as (typeof MINUTES)[number]) ? minute : "00";

  const handleHourChange = (h: string) => {
    onChange(`${h}:${minute}`);
  };

  const handleMinuteChange = (m: string) => {
    onChange(`${hour}:${m}`);
  };

  useEffect(() => {
    if (!value || !/^\d{1,2}:\d{2}$/.test(value)) {
      onChange("09:00");
    }
  }, []);

  return (
    <div className="flex gap-2 items-center rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring" id={id}>
      <Select value={hour} onValueChange={handleHourChange} aria-label={ariaLabel ? `${ariaLabel} hour` : undefined}>
        <SelectTrigger className="h-8 w-[72px] border-0 bg-transparent px-2 shadow-none focus:ring-0 focus-visible:ring-0" aria-label={ariaLabel ? `${ariaLabel} hour` : "Hour"}>
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-medium">:</span>
      <Select value={minuteOption} onValueChange={handleMinuteChange} aria-label={ariaLabel ? `${ariaLabel} minute` : undefined}>
        <SelectTrigger className="h-8 w-[72px] border-0 bg-transparent px-2 shadow-none focus:ring-0 focus-visible:ring-0" aria-label={ariaLabel ? `${ariaLabel} minute` : "Minute"}>
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

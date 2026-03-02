import type { SupabaseClient } from "npm:@supabase/supabase-js";
import { getGMT3DateString, isWeekend } from "./calculations.ts";

/** Get the currently open cash drawer, or null. */
export async function getCurrentOpenDrawer(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("daily_drawers")
    .select("*")
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.log("Error fetching open drawer:", error);
    return null;
  }

  return data;
}

/**
 * Validate that a cash drawer is open and matches today's date.
 * Returns the open drawer if valid, or an error response body + status.
 */
export async function validateCashDrawer(
  supabase: SupabaseClient,
  payments: any[],
  existingDrawer?: any,
): Promise<{ drawer: any | null; error?: string; status?: number }> {
  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return { drawer: null };
  }

  const paymentMethodIds = payments.map((p: any) => p.methodId).filter(Boolean);
  if (paymentMethodIds.length === 0) {
    return { drawer: null };
  }

  const { data: paymentMethodsData, error: pmError } = await supabase
    .from("payments_methods")
    .select("id, payment_type")
    .in("id", paymentMethodIds);

  if (pmError || !paymentMethodsData) {
    return { drawer: null };
  }

  const hasCashPayment = paymentMethodsData.some((pm: any) => pm.payment_type === 'cash');
  if (!hasCashPayment) {
    return { drawer: null };
  }

  const openDrawer = existingDrawer ?? await getCurrentOpenDrawer(supabase);
  if (!openDrawer) {
    return {
      drawer: null,
      error: "No cash drawer is open. Please open a cash drawer first.",
      status: 400,
    };
  }

  const todayGMT3String = getGMT3DateString();
  const drawerDateString = new Date(openDrawer.business_date).toISOString().split('T')[0];
  if (drawerDateString !== todayGMT3String) {
    return {
      drawer: null,
      error: `Cash drawer is open for ${drawerDateString}. You forgot to close yesterday's drawer. Please close it first.`,
      status: 400,
    };
  }

  return { drawer: openDrawer };
}

/** Validate that a date string is not on a weekend or holiday. */
export async function validateDateNotWeekendOrHoliday(
  dateStr: string,
  dateType: 'start' | 'end',
): Promise<{ valid: boolean; error?: string }> {
  try {
    const date = new Date(dateStr + 'T00:00:00');

    if (isWeekend(date)) {
      const dayName = date.getDay() === 0 ? 'Sunday' : 'Saturday';
      return {
        valid: false,
        error: `${dateType === 'start' ? 'Start' : 'Return'} date cannot be on a weekend (${dayName}). Please select a weekday.`,
      };
    }

    try {
      const year = date.getFullYear();
      const response = await fetch(`https://www.i-pyxis.com/api/holidays/${year}/AR`);
      if (response.ok) {
        const holidays = await response.json();
        const isHoliday = holidays.some((h: any) => h.date === dateStr);
        if (isHoliday) {
          const holiday = holidays.find((h: any) => h.date === dateStr);
          return {
            valid: false,
            error: `${dateType === 'start' ? 'Start' : 'Return'} date cannot be on a holiday (${holiday?.name || 'Holiday'}). Please select a different date.`,
          };
        }
      } else {
        console.log(`Holiday API returned status ${response.status} for year ${year}, skipping holiday validation`);
      }
    } catch (holidayError) {
      console.log('Failed to fetch holidays for validation, skipping holiday check:', holidayError);
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating date:', error);
    return { valid: true };
  }
}

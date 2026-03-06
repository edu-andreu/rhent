/**
 * Helpers for deriving current user info from request context.
 * Auth middleware must run first and set "appUser" on context (see index.tsx).
 */

type ContextWithAppUser = {
  get: (key: string) => unknown;
};

/**
 * Returns a display string for the current user (full_name or email) for use in
 * created_by, updated_by, opened_by, closed_by columns. Use in route handlers
 * after auth middleware has run.
 */
export function getCurrentUserDisplay(c: ContextWithAppUser): string {
  const appUser = c.get("appUser") as
    | { full_name?: string | null; email?: string }
    | undefined;
  const name = appUser?.full_name?.trim();
  const email = appUser?.email?.trim();
  return name || email || "Unknown";
}

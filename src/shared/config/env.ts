/**
 * Environment Configuration
 * 
 * Centralized configuration management using environment variables.
 * Falls back to hardcoded values for backward compatibility during migration.
 * 
 * Required environment variables:
 * - VITE_SUPABASE_PROJECT_ID: Supabase project ID
 * - VITE_SUPABASE_ANON_KEY: Supabase anonymous/public key
 * - VITE_SUPABASE_EDGE_FUNCTION_SLUG: Edge function slug (optional, defaults to "make-server-918f1e54")
 * - VITE_SUPABASE_URL: Full Supabase URL (optional, constructed from project ID if not provided)
 */

// Get environment variables with fallbacks for backward compatibility
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
};

/**
 * Supabase project configuration
 */
export const supabaseConfig = {
  /** Supabase project ID */
  projectId: getEnvVar("VITE_SUPABASE_PROJECT_ID", "iclkknwhafsluomwtcxp"),
  
  /** Supabase anonymous/public key */
  publicAnonKey: getEnvVar(
    "VITE_SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbGtrbndoYWZzbHVvbXd0Y3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTE1NDksImV4cCI6MjA3NjYyNzU0OX0.0yFhxG2AvPQz2vOhanDEswrZePOSQCUDblfdBA1cfAA"
  ),
  
  /** Edge function slug */
  edgeFunctionSlug: getEnvVar("VITE_SUPABASE_EDGE_FUNCTION_SLUG", "make-server-918f1e54"),
  
  /** Full Supabase URL (constructed if not provided) */
  url: getEnvVar(
    "VITE_SUPABASE_URL",
    `https://${getEnvVar("VITE_SUPABASE_PROJECT_ID", "iclkknwhafsluomwtcxp")}.supabase.co`
  ),
  
  /** Functions base URL */
  functionsBaseUrl: (): string =>
    `https://${getEnvVar("VITE_SUPABASE_PROJECT_ID", "iclkknwhafsluomwtcxp")}.supabase.co/functions/v1/${getEnvVar("VITE_SUPABASE_EDGE_FUNCTION_SLUG", "make-server-918f1e54")}`,
  
  /** Storage base URL */
  storageBaseUrl: (): string =>
    `https://${getEnvVar("VITE_SUPABASE_PROJECT_ID", "iclkknwhafsluomwtcxp")}.supabase.co/storage/v1/object/public`,
};

/**
 * Application configuration
 */
export const appConfig = {
  /** Whether debug mode is enabled */
  isDebugMode: (): boolean => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("debug") === "true";
    }
    return false;
  },
  
  /** Environment name (development, production, etc.) */
  environment: getEnvVar("VITE_ENV", "development"),
  
  /** Whether we're in production */
  isProduction: (): boolean => getEnvVar("VITE_ENV", "development") === "production",
};

/**
 * Export individual values for backward compatibility
 */
export const projectId = supabaseConfig.projectId;
export const publicAnonKey = supabaseConfig.publicAnonKey;
export const EDGE_FUNCTION_SLUG = supabaseConfig.edgeFunctionSlug;

/**
 * Build function URL helper
 */
export const buildFunctionUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${supabaseConfig.functionsBaseUrl()}/${normalizedPath}`;
};

/**
 * Build storage URL helper
 */
export const buildStorageUrl = (bucket: string, path: string): string => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${supabaseConfig.storageBaseUrl()}/${bucket}/${normalizedPath}`;
};

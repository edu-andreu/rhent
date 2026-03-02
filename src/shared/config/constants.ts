import { supabaseConfig, buildFunctionUrl as buildFunctionUrlFromEnv, EDGE_FUNCTION_SLUG as ENV_EDGE_FUNCTION_SLUG } from "./env";

/**
 * @deprecated Use EDGE_FUNCTION_SLUG from env.ts instead
 * Kept for backward compatibility
 */
export const EDGE_FUNCTION_SLUG = ENV_EDGE_FUNCTION_SLUG;

/**
 * @deprecated Use supabaseConfig.functionsBaseUrl() from env.ts instead
 * Kept for backward compatibility
 */
export const buildFunctionsBaseUrl = (): string => supabaseConfig.functionsBaseUrl();

/**
 * @deprecated Use buildFunctionUrl from env.ts instead
 * Kept for backward compatibility
 */
export const buildFunctionUrl = buildFunctionUrlFromEnv;

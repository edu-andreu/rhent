-- Fix: unaccent_imm calls unaccent('unaccent'::regdictionary, t) with search_path=public.
-- The text search dictionary "unaccent" lives in extensions schema, so the unqualified
-- regdictionary cast fails. Use fully qualified names for both the function and dictionary.
-- This function is used by generated columns on brand, location, and name tables.

CREATE OR REPLACE FUNCTION public.unaccent_imm(t text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE
  SET search_path = ''
AS $function$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, t);
$function$;

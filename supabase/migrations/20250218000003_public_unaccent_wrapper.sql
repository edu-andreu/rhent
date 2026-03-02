-- Unaccent lives in extensions schema; trigger functions with search_path = ''
-- call unaccent(text) and fail because the dictionary lookup can't find "unaccent".
-- Add a public wrapper so unaccent(...) resolves here and delegates to extensions.
-- Use the two-argument form so the dictionary is explicit and search_path-independent.

CREATE OR REPLACE FUNCTION public.unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE STRICT
  SET search_path = ''
AS $function$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$function$;

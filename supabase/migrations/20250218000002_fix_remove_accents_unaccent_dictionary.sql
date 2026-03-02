-- Fix: remove_accents used extensions.unaccent(input) which looks up
-- text search dictionary "unaccent" in search_path; with search_path = ''
-- that lookup fails. Use the two-argument form with the fully qualified
-- dictionary name so the function works regardless of search_path.

CREATE OR REPLACE FUNCTION public.remove_accents(input text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE STRICT
  SET search_path = ''
AS $function$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, input);
$function$;

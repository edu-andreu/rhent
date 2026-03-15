-- Add created_by to owner_distributions so fn_audit_log_trigger() records an actor.
ALTER TABLE public.owner_distributions
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Attach audit trigger so inserts/updates/deletes are logged in audit_log.
DROP TRIGGER IF EXISTS trg_audit_log_owner_distributions ON public.owner_distributions;
CREATE TRIGGER trg_audit_log_owner_distributions
  AFTER INSERT OR UPDATE OR DELETE ON public.owner_distributions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log_trigger();

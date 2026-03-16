-- Aggregate rental counts per item in the database instead of fetching all rows
CREATE OR REPLACE FUNCTION get_rental_counts()
RETURNS TABLE(item_id uuid, rental_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT item_id, count(*) AS rental_count
  FROM rental_items
  WHERE status IN ('reserved', 'checked_out', 'returned', 'completed')
    AND item_id IS NOT NULL
  GROUP BY item_id;
$$;

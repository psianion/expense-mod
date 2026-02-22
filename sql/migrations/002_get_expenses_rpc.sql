-- Migration: add get_expenses RPC function for server-side filtering
-- Enables substring search on the tags array via array_to_string ILIKE.
-- Called from the repo via: client.rpc('get_expenses', params, { count: 'exact' })
-- PostgREST chains .order() and .range() on the SETOF result.

CREATE OR REPLACE FUNCTION get_expenses(
  p_user_id         uuid      DEFAULT NULL,
  p_use_master_access boolean DEFAULT false,
  p_type            text      DEFAULT NULL,
  p_category        text      DEFAULT NULL,
  p_platform        text      DEFAULT NULL,
  p_payment_method  text      DEFAULT NULL,
  p_date_from       timestamptz DEFAULT NULL,
  p_date_to         timestamptz DEFAULT NULL,
  p_source          text      DEFAULT NULL,
  p_bill_instance_id uuid     DEFAULT NULL,
  p_search          text      DEFAULT NULL
)
RETURNS SETOF expenses
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM expenses e
  WHERE
    -- User scoping: either master access, no user context, or matching user
    (p_use_master_access OR p_user_id IS NULL OR e.user_id = p_user_id)
    -- Exact filters (NULL = no filter applied)
    AND (p_type IS NULL           OR e.type = p_type)
    AND (p_category IS NULL       OR e.category = p_category)
    AND (p_platform IS NULL       OR e.platform = p_platform)
    AND (p_payment_method IS NULL OR e.payment_method = p_payment_method)
    AND (p_date_from IS NULL      OR e.datetime >= p_date_from)
    AND (p_date_to IS NULL        OR e.datetime <= p_date_to)
    AND (p_source IS NULL         OR e.source = p_source)
    AND (p_bill_instance_id IS NULL OR e.bill_instance_id = p_bill_instance_id)
    -- Full-text substring search including tags array
    AND (
      p_search IS NULL OR
      e.category       ILIKE '%' || p_search || '%' OR
      e.platform       ILIKE '%' || p_search || '%' OR
      e.payment_method ILIKE '%' || p_search || '%' OR
      e.raw_text       ILIKE '%' || p_search || '%' OR
      array_to_string(e.tags, ' ') ILIKE '%' || p_search || '%'
    );
$$;

-- Grant execute to the anon and authenticated roles used by PostgREST
GRANT EXECUTE ON FUNCTION get_expenses TO anon, authenticated;

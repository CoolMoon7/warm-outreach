-- Drop the existing view
DROP VIEW IF EXISTS public.template_performance;

-- Recreate view with SECURITY INVOKER to respect RLS policies
CREATE VIEW public.template_performance
WITH (security_invoker=on)
AS
SELECT
  t.id AS template_id,
  t.name AS template_name,
  t.team_id,
  COUNT(e.id) AS total_sent,
  SUM(CASE WHEN e.responded THEN 1 ELSE 0 END) AS responded_count,
  ROUND(100.0 * SUM(CASE WHEN e.responded THEN 1 ELSE 0 END) / NULLIF(COUNT(e.id), 0), 2) AS response_rate
FROM templates t
LEFT JOIN emails e ON e.template_id = t.id
GROUP BY t.id, t.name, t.team_id;
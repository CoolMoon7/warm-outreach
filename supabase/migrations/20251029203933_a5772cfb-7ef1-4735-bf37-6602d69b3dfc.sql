-- Drop and recreate the template_performance view with security_invoker
DROP VIEW IF EXISTS template_performance;

CREATE VIEW template_performance
WITH (security_invoker=on)
AS
SELECT 
  t.id as template_id,
  t.name as template_name,
  t.team_id,
  COUNT(e.id) as total_sent,
  COUNT(e.id) FILTER (WHERE e.responded = true) as responded_count,
  CASE 
    WHEN COUNT(e.id) > 0 THEN 
      ROUND((COUNT(e.id) FILTER (WHERE e.responded = true)::numeric / COUNT(e.id)::numeric) * 100, 2)
    ELSE 0
  END as response_rate
FROM templates t
LEFT JOIN emails e ON e.template_id = t.id
GROUP BY t.id, t.name, t.team_id;
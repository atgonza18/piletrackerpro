-- Create an optimized RPC function for pile statistics
-- This function calculates all statistics in a single database call
-- Run this in Supabase SQL Editor for maximum performance

CREATE OR REPLACE FUNCTION get_pile_statistics(
  project_id_param UUID,
  tolerance_param NUMERIC DEFAULT 1
)
RETURNS TABLE (
  total_piles BIGINT,
  refusal_piles BIGINT,
  pending_piles BIGINT,
  accepted_piles BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_piles,
    COUNT(
      CASE 
        WHEN p.embedment IS NOT NULL 
          AND p.design_embedment IS NOT NULL 
          AND p.embedment::NUMERIC < (p.design_embedment::NUMERIC - tolerance_param)
        THEN 1 
      END
    )::BIGINT as refusal_piles,
    COUNT(
      CASE 
        WHEN p.embedment IS NULL OR p.design_embedment IS NULL 
        THEN 1 
      END
    )::BIGINT as pending_piles,
    COUNT(
      CASE 
        WHEN p.embedment IS NOT NULL 
          AND p.design_embedment IS NOT NULL 
          AND p.embedment::NUMERIC >= (p.design_embedment::NUMERIC - tolerance_param)
        THEN 1 
      END
    )::BIGINT as accepted_piles
  FROM piles p
  WHERE p.project_id = project_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_pile_statistics(UUID, NUMERIC) TO authenticated;

-- Create an index if it doesn't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_piles_project_embedment 
ON piles(project_id, embedment, design_embedment);

-- Test the function (replace with your actual project_id)
-- SELECT * FROM get_pile_statistics('your-project-id-here', 1);
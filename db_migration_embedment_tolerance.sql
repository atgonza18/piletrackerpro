-- Add embedment_tolerance column to projects table
ALTER TABLE IF EXISTS projects 
ADD COLUMN IF NOT EXISTS embedment_tolerance FLOAT DEFAULT 1.0;

-- Comment on the column
COMMENT ON COLUMN projects.embedment_tolerance IS 'Tolerance in feet for flagging piles at refusal when embedment is less than design embedment minus this value'; 
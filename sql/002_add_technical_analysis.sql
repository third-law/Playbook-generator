-- Add technical_analysis field to analyses table
-- Migration 002: Add free text technical analysis field

ALTER TABLE analyses 
ADD COLUMN technical_analysis TEXT DEFAULT '';

-- Add comment explaining the field
COMMENT ON COLUMN analyses.technical_analysis IS 'Free text technical analysis from the user describing website performance, SEO technical status, and other technical factors affecting AI visibility';
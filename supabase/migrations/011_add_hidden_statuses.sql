-- Add hidden_statuses column to public_views
-- Issues with these status names will be excluded from the public view
ALTER TABLE public_views
  ADD COLUMN hidden_statuses TEXT[] NOT NULL DEFAULT '{}';

-- Issues whose status name is listed here are excluded from the public view.
-- IF NOT EXISTS: deployments of this fork applied the column earlier as migration 011.
ALTER TABLE public_views
  ADD COLUMN IF NOT EXISTS hidden_statuses TEXT[] NOT NULL DEFAULT '{}';

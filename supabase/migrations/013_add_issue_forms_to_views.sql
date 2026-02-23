-- Add enabled_issue_form_ids column to public_views for associating issue forms
ALTER TABLE public_views
    ADD COLUMN enabled_issue_form_ids UUID[] NOT NULL DEFAULT '{}';

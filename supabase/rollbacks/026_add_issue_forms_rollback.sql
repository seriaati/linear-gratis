ALTER TABLE public_views
  DROP COLUMN IF EXISTS enabled_issue_form_ids;

DROP TABLE IF EXISTS issue_forms;

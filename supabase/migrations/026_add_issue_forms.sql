-- Structured question templates for issues created from public views,
-- scoped to organisations like the other resource tables (migration 015).
-- Idempotent: deployments of this fork created the user-scoped table earlier
-- as migrations 012 and 013.

CREATE TABLE IF NOT EXISTS issue_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE issue_forms
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

UPDATE issue_forms f
SET organisation_id = o.id
FROM organisations o
WHERE f.organisation_id IS NULL AND o.created_by = f.user_id;

UPDATE issue_forms SET created_by = user_id WHERE created_by IS NULL;

ALTER TABLE issue_forms ALTER COLUMN organisation_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_issue_forms_user_id ON issue_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_issue_forms_organisation_id ON issue_forms(organisation_id);

ALTER TABLE issue_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own issue forms" ON issue_forms;
DROP POLICY IF EXISTS "Users can insert own issue forms" ON issue_forms;
DROP POLICY IF EXISTS "Users can update own issue forms" ON issue_forms;
DROP POLICY IF EXISTS "Users can delete own issue forms" ON issue_forms;

CREATE POLICY "Members can view issue_forms in their orgs" ON issue_forms
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert issue_forms into their orgs" ON issue_forms
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update issue_forms in their orgs" ON issue_forms
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete issue_forms in their orgs" ON issue_forms
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_issue_forms_updated_at ON issue_forms;
CREATE TRIGGER update_issue_forms_updated_at
  BEFORE UPDATE ON issue_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public_views
  ADD COLUMN IF NOT EXISTS enabled_issue_form_ids UUID[] NOT NULL DEFAULT '{}';

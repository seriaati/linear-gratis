-- Add issue_forms table for structured issue submission templates
CREATE TABLE issue_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_issue_forms_user_id ON issue_forms(user_id);

ALTER TABLE issue_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own issue forms" ON issue_forms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own issue forms" ON issue_forms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issue forms" ON issue_forms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own issue forms" ON issue_forms
    FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_issue_forms_updated_at
    BEFORE UPDATE ON issue_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

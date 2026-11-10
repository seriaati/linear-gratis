ALTER TABLE public_views
    ADD COLUMN allow_image_uploads BOOLEAN NOT NULL DEFAULT false;

-- Public so Linear and its GitHub sync can display the images without auth.
-- Uploads go through the API with the service role key, so no RLS policies are needed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'issue-attachments',
    'issue-attachments',
    true,
    10485760,
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

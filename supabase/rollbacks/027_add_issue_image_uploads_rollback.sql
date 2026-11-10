-- Objects must be removed (via the Storage API) before the bucket can be deleted.
DELETE FROM storage.buckets WHERE id = 'issue-attachments';

ALTER TABLE public_views
  DROP COLUMN IF EXISTS allow_image_uploads;

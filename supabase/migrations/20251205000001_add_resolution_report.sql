-- Migration: Add resolution report fields to tickets table
-- Date: 2025-12-05

-- Add resolution_report and resolution_attachments columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_report TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_attachments JSONB;

-- Add comment to describe the columns
COMMENT ON COLUMN tickets.resolution_report IS 'Manager report describing how the issue was resolved';
COMMENT ON COLUMN tickets.resolution_attachments IS 'JSON array of attachment objects with name, url, size, type';

-- Create storage bucket for attachments if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments bucket
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS allow_uploads ON storage.objects;
    DROP POLICY IF EXISTS allow_reads ON storage.objects;
    DROP POLICY IF EXISTS allow_deletes ON storage.objects;
    
    -- Allow authenticated users to upload
    CREATE POLICY allow_uploads ON storage.objects 
    FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'attachments');
    
    -- Allow public read access for attachments
    CREATE POLICY allow_reads ON storage.objects 
    FOR SELECT TO public 
    USING (bucket_id = 'attachments');
    
    -- Allow authenticated users to delete their uploads
    CREATE POLICY allow_deletes ON storage.objects 
    FOR DELETE TO authenticated 
    USING (bucket_id = 'attachments');
END $$;

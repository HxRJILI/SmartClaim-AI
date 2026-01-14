-- Migration: RAG Auto-Sync Triggers
-- Automatically sync tickets and comments to RAG service when they change

-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Configuration: RAG service URL (change in production)
-- For local dev, use host.docker.internal to reach localhost from Supabase container
DO $$
BEGIN
  -- Create config table if not exists
  CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Insert RAG service URL (use host.docker.internal for Docker-to-Docker communication)
  INSERT INTO public.app_config (key, value) 
  VALUES ('rag_service_url', 'http://host.docker.internal:8004')
  ON CONFLICT (key) DO NOTHING;
END $$;

-- Function to notify RAG service of ticket changes
CREATE OR REPLACE FUNCTION public.notify_rag_ticket_change()
RETURNS TRIGGER AS $$
DECLARE
  rag_url TEXT;
  payload JSONB;
  response extensions.http_response;
BEGIN
  -- Get RAG service URL from config
  SELECT value INTO rag_url FROM public.app_config WHERE key = 'rag_service_url';
  
  -- If no URL configured, skip silently
  IF rag_url IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );
  
  -- Call RAG webhook asynchronously (fire and forget)
  BEGIN
    SELECT * INTO response FROM extensions.http((
      'POST',
      rag_url || '/webhook/ticket',
      ARRAY[extensions.http_header('Content-Type', 'application/json')],
      'application/json',
      payload::TEXT
    )::extensions.http_request);
    
    -- Log success
    RAISE NOTICE 'RAG webhook called for ticket %: %', 
      COALESCE(NEW.id, OLD.id)::TEXT, 
      response.status;
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the transaction if webhook fails
    RAISE WARNING 'RAG webhook failed: %', SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify RAG service of comment changes
CREATE OR REPLACE FUNCTION public.notify_rag_comment_change()
RETURNS TRIGGER AS $$
DECLARE
  rag_url TEXT;
  payload JSONB;
  response extensions.http_response;
BEGIN
  -- Get RAG service URL from config
  SELECT value INTO rag_url FROM public.app_config WHERE key = 'rag_service_url';
  
  -- If no URL configured, skip silently
  IF rag_url IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Build webhook payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
  );
  
  -- Call RAG webhook asynchronously
  BEGIN
    SELECT * INTO response FROM extensions.http((
      'POST',
      rag_url || '/webhook/comment',
      ARRAY[extensions.http_header('Content-Type', 'application/json')],
      'application/json',
      payload::TEXT
    )::extensions.http_request);
    
    RAISE NOTICE 'RAG comment webhook called for ticket %: %', 
      COALESCE(NEW.ticket_id, OLD.ticket_id)::TEXT, 
      response.status;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'RAG comment webhook failed: %', SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on tickets table
DROP TRIGGER IF EXISTS trg_rag_ticket_insert ON public.tickets;
DROP TRIGGER IF EXISTS trg_rag_ticket_update ON public.tickets;
DROP TRIGGER IF EXISTS trg_rag_ticket_delete ON public.tickets;

CREATE TRIGGER trg_rag_ticket_insert
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rag_ticket_change();

CREATE TRIGGER trg_rag_ticket_update
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rag_ticket_change();

CREATE TRIGGER trg_rag_ticket_delete
  AFTER DELETE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rag_ticket_change();

-- Create triggers on ticket_comments table
DROP TRIGGER IF EXISTS trg_rag_comment_insert ON public.ticket_comments;
DROP TRIGGER IF EXISTS trg_rag_comment_update ON public.ticket_comments;
DROP TRIGGER IF EXISTS trg_rag_comment_delete ON public.ticket_comments;

CREATE TRIGGER trg_rag_comment_insert
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rag_comment_change();

CREATE TRIGGER trg_rag_comment_update
  AFTER UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rag_comment_change();

CREATE TRIGGER trg_rag_comment_delete
  AFTER DELETE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rag_comment_change();

-- Grant necessary permissions
GRANT SELECT ON public.app_config TO authenticated;
GRANT SELECT ON public.app_config TO service_role;

COMMENT ON TABLE public.app_config IS 'Application configuration including RAG service URL';
COMMENT ON FUNCTION public.notify_rag_ticket_change() IS 'Webhook trigger to sync ticket changes to RAG service';
COMMENT ON FUNCTION public.notify_rag_comment_change() IS 'Webhook trigger to sync comment changes to RAG service';

-- Schema setup for media platform backend

CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  ref TEXT,
  page INTEGER,
  position_on_page INTEGER,
  title TEXT NOT NULL,
  extension TEXT,
  list_date TEXT,
  detail_date TEXT,
  effective_date TEXT,
  primary_video_url TEXT,
  video_urls TEXT[] DEFAULT '{}',
  resource_id TEXT,
  access TEXT,
  contributed_by TEXT,
  keywords TEXT[] DEFAULT '{}',
  ole_course_code TEXT,
  ole_term_code TEXT,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_items_ref ON media_items(ref);
CREATE INDEX IF NOT EXISTS idx_media_items_resource_id ON media_items(resource_id);
CREATE INDEX IF NOT EXISTS idx_media_items_access ON media_items(access);

CREATE TABLE IF NOT EXISTS media_workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  concurrency INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_workers_base_url ON media_workers(LOWER(base_url));
CREATE INDEX IF NOT EXISTS idx_media_workers_active ON media_workers(is_active);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY,
  media_item_id TEXT REFERENCES media_items(id) ON DELETE SET NULL,
  ref TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_message TEXT,
  processor_job_id TEXT,
  processor_worker_id TEXT REFERENCES media_workers(id) ON DELETE SET NULL,
  error TEXT,
  priority TEXT DEFAULT 'normal',
  queued_by TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_ref ON processing_jobs(ref);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_processor ON processing_jobs(processor_job_id);

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS processor_worker_id TEXT REFERENCES media_workers(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_processing_jobs_worker'
  ) THEN
    EXECUTE 'CREATE INDEX idx_processing_jobs_worker ON processing_jobs(processor_worker_id)';
  END IF;
END
$$;

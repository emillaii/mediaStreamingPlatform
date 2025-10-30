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

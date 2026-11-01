-- Élia Marier local VPS; initialize via: psql -v ON_ERROR_STOP=1 -d elia -f vps/schema/001-init.sql
CREATE TABLE IF NOT EXISTS elia_nodes (
  path TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT elia_nodes_valid_path CHECK(length(path) BETWEEN 1 AND 500 AND path !~ '\.\.')
);
CREATE INDEX IF NOT EXISTS elia_event_date_idx ON elia_nodes ((data->>'date')) WHERE path LIKE 'studioPlanner_v1/events/%';
CREATE TABLE IF NOT EXISTS elia_users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  password_salt TEXT,
  password_hash TEXT,
  admin BOOLEAN NOT NULL DEFAULT FALSE,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS elia_users_email_unique ON elia_users (lower(email));
CREATE TABLE IF NOT EXISTS elia_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  uid TEXT NOT NULL REFERENCES elia_users(uid) ON DELETE CASCADE,
  session_version INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS elia_sessions_exp_idx ON elia_sessions(expires_at);

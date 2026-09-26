import { neon } from "@neondatabase/serverless";

export function getDb(){
  const url=process.env.DATABASE_URL||process.env.NEON_DATABASE_URL;
  return url?neon(url):null;
}

export async function ensureSchema(sql){
  await sql.query("CREATE TABLE IF NOT EXISTS gd_trips (id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("ALTER TABLE gd_trips ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'legacy'");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_trips_owner_updated_idx ON gd_trips(owner_id, updated_at DESC)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_access_control (owner_id TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'free', pricing_enabled BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("ALTER TABLE gd_access_control ADD COLUMN IF NOT EXISTS email TEXT");
  await sql.query("ALTER TABLE gd_access_control ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'");
  await sql.query("ALTER TABLE gd_access_control ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_user_data (owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(owner_id,kind))");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_driver_locations (owner_id TEXT NOT NULL, driver_id TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, trip_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(owner_id,driver_id))");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_reminder_log (owner_id TEXT NOT NULL, trip_id TEXT NOT NULL, reminder_type TEXT NOT NULL, channel TEXT NOT NULL, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), payload JSONB, PRIMARY KEY(owner_id,trip_id,reminder_type,channel))");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_grab_claims (trip_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, driver_id TEXT NOT NULL, driver_name TEXT, driver_phone TEXT, claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_grab_claims_owner_idx ON gd_grab_claims(owner_id, claimed_at DESC)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_device_registrations (token TEXT PRIMARY KEY, owner_id TEXT NOT NULL, platform TEXT NOT NULL, device_name TEXT, enabled BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_device_registrations_owner_idx ON gd_device_registrations(owner_id, platform, enabled)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_push_outbox (id BIGSERIAL PRIMARY KEY, recipient_id TEXT NOT NULL, trip_id TEXT, event_type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ)");
  await sql.query("ALTER TABLE gd_push_outbox ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0");
  await sql.query("ALTER TABLE gd_push_outbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_push_outbox_recipient_status_idx ON gd_push_outbox(recipient_id, status, created_at)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_line_groups (group_id TEXT PRIMARY KEY, group_name TEXT, enabled BOOLEAN NOT NULL DEFAULT TRUE, last_event_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_line_groups_enabled_idx ON gd_line_groups(enabled, updated_at DESC)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_grab_preferences (owner_id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT TRUE, regions JSONB NOT NULL DEFAULT '[]'::jsonb, airports JSONB NOT NULL DEFAULT '[]'::jsonb, min_amount INTEGER NOT NULL DEFAULT 0, keywords JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_line_candidate_notifications (candidate_id BIGINT NOT NULL, owner_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(candidate_id,owner_id))");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_line_candidates (id BIGSERIAL PRIMARY KEY, inbox_id BIGINT UNIQUE NOT NULL, group_id TEXT NOT NULL, payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'candidate', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_line_candidates_status_idx ON gd_line_candidates(status, created_at DESC)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_line_inbox (id BIGSERIAL PRIMARY KEY, source TEXT NOT NULL DEFAULT 'line', payload JSONB NOT NULL, processed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
}

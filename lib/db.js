import { neon } from "@neondatabase/serverless";

export function getDb(){
  const url=process.env.DATABASE_URL||process.env.NEON_DATABASE_URL;
  return url?neon(url):null;
}

export async function ensureSchema(sql){
  await sql.query("CREATE TABLE IF NOT EXISTS gd_trips (id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("ALTER TABLE gd_trips ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT 'legacy'");
  await sql.query("CREATE INDEX IF NOT EXISTS gd_trips_owner_updated_idx ON gd_trips(owner_id, updated_at DESC)");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_user_data (owner_id TEXT NOT NULL, kind TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(owner_id,kind))");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_driver_locations (owner_id TEXT NOT NULL, driver_id TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION, trip_id TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(owner_id,driver_id))");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_line_inbox (id BIGSERIAL PRIMARY KEY, source TEXT NOT NULL DEFAULT 'line', payload JSONB NOT NULL, processed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
}

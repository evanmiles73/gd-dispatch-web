import { neon } from "@neondatabase/serverless";

export function getDb(){
  const url=process.env.DATABASE_URL||process.env.NEON_DATABASE_URL;
  return url?neon(url):null;
}

export async function ensureSchema(sql){
  await sql.query("CREATE TABLE IF NOT EXISTS gd_trips (id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await sql.query("CREATE TABLE IF NOT EXISTS gd_line_inbox (id BIGSERIAL PRIMARY KEY, source TEXT NOT NULL DEFAULT 'line', payload JSONB NOT NULL, processed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
}

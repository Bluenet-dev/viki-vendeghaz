import { NextRequest, NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

// Egyszeri migrálás endpoint – futtatás után törölhető
// Védelem: csak helyes admin jelszóval hívható
export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const steps = [
    `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bed_type text`,
    `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS amenities text`,
    `ALTER TABLE rooms DROP COLUMN IF EXISTS images`,
    `ALTER TABLE packages DROP COLUMN IF EXISTS image`,
    `DROP TABLE IF EXISTS gallery`,
    `CREATE TABLE IF NOT EXISTS gallery (
      id serial PRIMARY KEY,
      url text NOT NULL,
      alt text,
      category text NOT NULL,
      sort_order integer DEFAULT 0,
      created_at timestamp DEFAULT now()
    )`,
  ];

  const results: string[] = [];
  const client = await pool.connect();
  try {
    for (const step of steps) {
      try {
        await client.query(step);
        results.push(`OK: ${step.trim().slice(0, 60)}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push(`SKIP/ERR: ${msg.slice(0, 80)}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  return NextResponse.json({ results });
}

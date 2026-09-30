// Csak olvas: összeveti a v2 táblákat a régi availability / messages adatokkal.
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
console.log(new URL(process.env.DATABASE_URL).hostname.split(".")[0]);

const [a] = await sql`SELECT
  (SELECT count(*)::int FROM availability WHERE status = 'blocked') AS av_rows,
  (SELECT count(*)::int FROM (SELECT DISTINCT room_slug, date FROM availability WHERE status = 'blocked') x) AS av_distinct,
  (SELECT count(*)::int FROM closures) AS closures,
  (SELECT count(*)::int FROM (
     SELECT DISTINCT room_slug, date FROM availability WHERE status = 'blocked'
     EXCEPT SELECT room_scope, date FROM closures) x) AS av_missing_in_closures,
  (SELECT count(*)::int FROM (
     SELECT room_scope, date FROM closures
     EXCEPT SELECT room_slug, date FROM availability WHERE status = 'blocked') x) AS closures_not_in_av,
  (SELECT count(*)::int FROM messages WHERE type = 'booking_request') AS msg_requests,
  (SELECT count(*)::int FROM bookings) AS bookings,
  (SELECT count(*)::int FROM bookings WHERE legacy_message_id IS NULL) AS bookings_without_legacy,
  (SELECT count(*)::int FROM closures WHERE booking_id IS NOT NULL) AS closures_linked,
  (SELECT count(*)::int FROM day_rates) AS day_rates,
  (SELECT min(date)::text || ' – ' || max(date)::text FROM day_rates) AS day_rates_range`;
console.table(a);
console.table(await sql`SELECT status, count(*)::int AS db FROM bookings GROUP BY status ORDER BY status`);

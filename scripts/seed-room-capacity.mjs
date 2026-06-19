import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const ROWS = [
  { roomScope: "szoba-1", baseCapacity: 2, extraGuestFeePerNight: 7000 },
  { roomScope: "szoba-2", baseCapacity: 2, extraGuestFeePerNight: 7000 },
  { roomScope: "superior", baseCapacity: 2, extraGuestFeePerNight: 8000 },
  { roomScope: "egesz_haz", baseCapacity: 10, extraGuestFeePerNight: 7000 },
];

for (const r of ROWS) {
  const existing = await sql`select id from room_capacity_pricing where room_scope = ${r.roomScope}`;
  if (existing.length > 0) {
    console.log("Already exists, skipping:", r.roomScope);
    continue;
  }
  const result = await sql`
    insert into room_capacity_pricing (room_scope, base_capacity, extra_guest_fee_per_night)
    values (${r.roomScope}, ${r.baseCapacity}, ${r.extraGuestFeePerNight})
    returning *`;
  console.log(result);
}

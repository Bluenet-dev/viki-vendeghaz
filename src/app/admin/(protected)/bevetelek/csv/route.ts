import { NextRequest, NextResponse } from "next/server";
import { SOURCE_LABEL, STATUS_LABEL, targetLabel, type Source, type Status } from "@/lib/booking/constants";
import { todayBudapest } from "@/lib/booking/dates";
import { revenueCsv } from "@/lib/revenue";
import { getSession } from "@/lib/session";
import { loadRevenueInput } from "../data";

// Foglalások egy évre, könyvelőnek. A route handlerre az admin layout védelme nem
// vonatkozik, ezért itt külön ellenőrizzük a bejelentkezést.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn) return NextResponse.json({ error: "Nincs bejelentkezve." }, { status: 401 });
  const today = todayBudapest();
  const ev = Number(req.nextUrl.searchParams.get("ev"));
  const year = Number.isInteger(ev) && ev > 2000 && ev < 2100 ? ev : Number(today.slice(0, 4));
  const { bookings } = await loadRevenueInput();
  const csv = revenueCsv(year, bookings, today, {
    status: (s) => STATUS_LABEL[s as Status] ?? s,
    source: (s) => SOURCE_LABEL[s as Source] ?? s,
    unit: (s) => targetLabel(s),
  });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bevetelek-${year}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

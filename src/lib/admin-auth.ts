import { getSession } from "@/lib/session";

// A server action nyilvánosan hívható végpont – a layout védelme nem elég,
// minden admin actionnek magának is ellenőriznie kell a bejelentkezést.
export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("Nincs bejelentkezve.");
}

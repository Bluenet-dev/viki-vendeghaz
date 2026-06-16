"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function loginAction(_prev: string | null, formData: FormData) {
  const password = formData.get("password") as string;

  if (password !== process.env.ADMIN_PASSWORD) {
    return "Hibás jelszó.";
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  redirect("/admin");
}

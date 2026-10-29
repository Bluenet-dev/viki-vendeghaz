import { redirect } from "next/navigation";

// A régi iCal-forráskezelő helyére a Naptár-szinkron panel lépett.
export default function IcalSourcesPage() {
  redirect("/admin/naptar/szinkron");
}

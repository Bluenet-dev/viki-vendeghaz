import ical, { VEvent } from "node-ical";

export interface ICalEvent {
  date: string; // YYYY-MM-DD
  summary: string;
}

export async function fetchAndParseIcal(url: string): Promise<ICalEvent[]> {
  const events: ICalEvent[] = [];

  const data = await ical.async.fromURL(url);

  for (const component of Object.values(data)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component as VEvent;

    const start = event.start;
    const end = event.end;
    if (!start) continue;

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(start);

    // iCal-ban a DTEND kizárólagos (checkout nap) – az utolsó napot nem tároljuk
    const current = new Date(startDate);
    while (current < endDate) {
      events.push({
        date: current.toISOString().slice(0, 10),
        summary: (event.summary as string | undefined) ?? "Foglalt",
      });
      current.setDate(current.getDate() + 1);
    }
  }

  return events;
}

export function generateIcs(
  roomName: string,
  events: { date: string; note?: string | null }[]
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Viki Vendégház//vikivendeghaz.hu//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${roomName} – Viki Vendégház`,
    "X-WR-TIMEZONE:Europe/Budapest",
  ];

  for (const event of events) {
    // DTEND a következő nap (checkout nap)
    const start = event.date.replace(/-/g, "");
    const endDate = new Date(event.date);
    endDate.setDate(endDate.getDate() + 1);
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, "");
    const uid = `${event.date}-${roomName.toLowerCase().replace(/\s+/g, "-")}@vikivendeghaz.hu`;

    lines.push(
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${event.note ?? "Foglalt"}`,
      `UID:${uid}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

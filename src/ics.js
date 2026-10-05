function esc(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function dtstamp(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function eventDate(game) {
  const date = game.date.replaceAll("-", "");
  if (!game.time) return `${date}T120000`;
  return `${date}T${game.time.replace(":", "")}00`;
}

export function makeICS(games, clubName) {
  const now = dtstamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendario Voleibol Madrid//ES//",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(clubName)}`,
    "X-WR-TIMEZONE:Europe/Madrid"
  ];

  for (const g of games) {
    const uid = `voleibol-${g.id}@calendario-voleibol`;
    const start = eventDate(g);
    const summary = `${g.home} - ${g.away}`;
    const description = g.pendingTime
      ? "Hora pendiente de publicación por la Federación de Madrid de Voleibol."
      : `Partido de voleibol. Jornada ${g.jornada ?? ""}.`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${esc(uid)}`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Madrid:${start}`,
      `SUMMARY:${esc(summary)}`,
      `LOCATION:${esc(g.venue)}`,
      `DESCRIPTION:${esc(description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadText(text, filename, type = "text/calendar;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

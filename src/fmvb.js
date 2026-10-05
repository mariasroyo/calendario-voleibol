/*
 * Adaptador de la Federación de Madrid de Voleibol.
 *
 * La FMVB muestra "Calendario completo" con jornadas, fecha/hora,
 * equipos, pabellón y número de partido. Este parser intenta trabajar
 * con el HTML visible, sin depender de IDs frágiles.
 */

const MONTHS = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function clean(s) {
  return (s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(text) {
  const m = clean(text).match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (!m) return null;
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  return `${y}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
}

function parseTime(text) {
  const t = clean(text);
  const m = t.match(/\b([01]?\d|2[0-3])[:.][0-5]\d(?:\s*h)?\b/i);
  if (!m) return null;
  const hhmm = m[0].replace(/\s*h/i, "").replace(".", ":");
  return hhmm.length === 4 ? `0${hhmm}` : hhmm;
}

function isPendingTime(time, raw) {
  const s = clean(`${time || ""} ${raw || ""}`).toLowerCase();
  if (!time) return true;
  if (time === "00:00" || time === "00:00:00") return true;
  return /\b(tbd|tbc|pendiente|por determinar|sin hora|hora pendiente)\b/.test(s);
}

function absoluteUrl(base, href) {
  try { return new URL(href, base).href; } catch { return href || ""; }
}

function elementText(el) {
  return clean(el?.innerText || el?.textContent || "");
}

function nearestBlock(el) {
  let node = el;
  for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
    const t = elementText(node);
    if (t.length > 50 && t.length < 1500) return node;
  }
  return el?.parentElement || el;
}

function teamCandidates(block) {
  const imgs = [...block.querySelectorAll("img[alt]")].map(x => clean(x.alt));
  const text = elementText(block);
  const candidates = [
    ...imgs,
    ...text.split(/\n+/).map(clean),
  ].filter(Boolean);

  return [...new Set(candidates)].filter(s => {
    const low = s.toLowerCase();
    return !/^(escudo|image|pabellón|num\.?\s*partido|jornada|calendario|resultado|clasificación)/i.test(low);
  });
}

function findGamesFromBlocks(doc, cfg) {
  const out = [];
  const seen = new Set();

  // Buscamos bloques que contienen fecha. El marcado de FMVB puede cambiar,
  // por lo que probamos varios elementos contenedores.
  const candidates = [...doc.querySelectorAll("article, li, tr, div, section")];

  for (const el of candidates) {
    const text = elementText(el);
    if (!/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(text)) continue;
    if (text.length < 30 || text.length > 1800) continue;

    const date = parseDate(text);
    if (!date) continue;

    const aliases = cfg.teamAliases.map(x => x.toLowerCase());
    const low = text.toLowerCase();
    if (!aliases.some(a => low.includes(a))) continue;

    const block = nearestBlock(el);
    const btext = elementText(block);
    const date2 = parseDate(btext) || date;
    const time = parseTime(btext);

    const lines = teamCandidates(block);
    const teamHits = lines.filter(x =>
      aliases.some(a => x.toLowerCase().includes(a))
    );
    if (!teamHits.length) continue;

    // Heurística para obtener dos equipos:
    // primero nombres que parecen "equipo" y no etiquetas.
    const teamLines = lines.filter(x =>
      x.length >= 3 &&
      x.length <= 90 &&
      !/^(pabellón|num\.?\s*partido|cómo llegar|calendario|resultado|clasificación|jornada)/i.test(x)
    );

    let home = teamLines[0] || "";
    let away = teamLines[1] || "";

    // Si el equipo objetivo aparece, forzamos su detección.
    const target = teamLines.find(x => aliases.some(a => x.toLowerCase().includes(a)));
    if (target) {
      const idx = teamLines.indexOf(target);
      if (idx === 0) { home = target; away = teamLines[1] || ""; }
      else { away = target; home = teamLines[idx - 1] || teamLines[0] || ""; }
    }

    const venueMatch = btext.match(/Pabell[oó]n:\s*(.+?)(?:(?:Num\.?\s*partido)|$)/i);
    const venue = venueMatch ? clean(venueMatch[1]) : "";

    const numMatch = btext.match(/Num\.?\s*partido:\s*([A-Za-z0-9_-]+)/i);
    const matchId = numMatch ? numMatch[1] : `${date2}|${home}|${away}`;

    if (seen.has(matchId)) continue;
    seen.add(matchId);

    const pending = isPendingTime(time, btext);

    out.push({
      id: String(matchId),
      date: date2,
      time: pending ? null : time,
      rawTime: time || "",
      pendingTime: pending,
      home,
      away,
      venue,
      jornada: extractJornada(btext),
      sourceUrl: cfg.sourceUrl,
      sourceRaw: btext
    });
  }

  return dedupeGames(out);
}

function extractJornada(text) {
  const m = clean(text).match(/Jornada\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

function dedupeGames(games) {
  const map = new Map();
  for (const g of games) {
    const key = g.id || `${g.date}|${g.home}|${g.away}`;
    if (!map.has(key) || (!map.get(key).venue && g.venue)) map.set(key, g);
  }
  return [...map.values()].sort((a,b) =>
    `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`)
  );
}

export async function fetchFederation(cfg, proxyUrl = "") {
  const stamp = Date.now();
  const source = `${cfg.sourceUrl}${cfg.sourceUrl.includes("?") ? "&" : "?"}_ts=${stamp}`;

  const url = proxyUrl
    ? `${proxyUrl.replace(/\/$/, "")}/?url=${encodeURIComponent(source)}`
    : source;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, max-age=0",
      "Pragma": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`FMVB respondió HTTP ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const games = findGamesFromBlocks(doc, cfg);

  if (!games.length) {
    throw new Error(
      "No se han podido extraer partidos. Puede que la FMVB haya cambiado su HTML o que el navegador haya bloqueado CORS."
    );
  }

  return {
    games,
    fetchedAt: new Date(),
    sourceUrl: source
  };
}

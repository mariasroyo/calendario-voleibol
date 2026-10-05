import { CLUBS, DEFAULT_CLUB, OPTIONAL_PROXY_URL } from "./config.js";
import { fetchFederation } from "./fmvb.js";
import { makeICS, downloadText } from "./ics.js";

const qs = new URLSearchParams(location.search);
const clubKey = qs.get("club") || DEFAULT_CLUB;
const cfg = CLUBS[clubKey] || CLUBS[DEFAULT_CLUB];

let games = [];
let hidePast = false;

const $ = id => document.getElementById(id);
const els = {
  name: $("club-name"),
  meta: $("club-meta"),
  calendar: $("calendar"),
  status: $("status"),
  updated: $("updated"),
  homeOnly: $("home-only"),
  hidePast: $("hide-past"),
  refresh: $("refresh"),
  ics: $("ics-link"),
  source: $("source-link")
};

els.name.textContent = cfg.name;
els.meta.textContent = `${cfg.category} · ${cfg.competition} · ${cfg.phase}`;
els.source.href = cfg.sourceUrl;

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function isHome(g) {
  const aliases = cfg.teamAliases.map(x => x.toLowerCase());
  return aliases.some(a => g.home.toLowerCase().includes(a));
}

function googleCalendarUrl(g) {
  const date = g.date.replaceAll("-", "");
  const start = g.time ? `${date}T${g.time.replace(":", "")}00` : `${date}T120000`;
  const end = g.time ? addOneHour(g.date, g.time) : `${date}T130000`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${g.home} - ${g.away}`,
    dates: `${start}/${end}`,
    location: g.venue || "",
    details: g.pendingTime
      ? "Hora pendiente de publicación por la Federación de Madrid de Voleibol."
      : `Jornada ${g.jornada ?? ""}`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addOneHour(date, time) {
  const d = new Date(`${date}T${time}:00`);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0,19).replace(/[-:]/g,"") + "00";
}

function render() {
  const filtered = games.filter(g => {
    if (els.homeOnly.checked && !isHome(g)) return false;
    if (hidePast && g.date < todayKey()) return false;
    return true;
  });

  if (!filtered.length) {
    els.calendar.innerHTML = `<div class="empty">No hay partidos que coincidan con los filtros.</div>`;
    return;
  }

  const groups = new Map();
  for (const g of filtered) {
    const key = g.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }

  els.calendar.innerHTML = [...groups.entries()].map(([date, list]) => `
    <section class="day">
      <h2>${formatDate(date)}</h2>
      ${list.map(card).join("")}
    </section>
  `).join("");
}

function card(g) {
  const home = isHome(g);
  const statusClass = g.pendingTime ? "pending" : "";
  const time = g.pendingTime ? "PENDIENTE" : g.time;
  const past = g.date < todayKey();

  return `
    <article class="match ${statusClass} ${past ? "past" : ""}">
      <div class="match-main">
        <div class="round">${g.jornada ? `J${g.jornada}` : ""}</div>
        <div class="teams">
          <div class="team">${escapeHtml(g.home)}</div>
          <div class="team">${escapeHtml(g.away)}</div>
        </div>
        <div class="time-wrap">
          <div class="time">${time}</div>
          <div class="venue">${home ? "🏠 Casa" : "✈️ Fuera"}</div>
        </div>
      </div>
      <div class="match-bottom">
        <span>📍 ${escapeHtml(g.venue || "Pabellón pendiente")}</span>
        <span class="actions">
          <a href="${googleCalendarUrl(g)}" target="_blank" rel="noopener" class="small-button">+ Google</a>
        </span>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function formatDate(date) {
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "numeric", month: "long"
  }).format(d);
}

function setICS() {
  const ics = makeICS(games, cfg.name);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  els.ics.href = url;
  els.ics.download = `${clubKey}.ics`;
}

async function load() {
  els.status.className = "status loading";
  els.status.textContent = "Consultando la Federación de Madrid de Voleibol…";
  els.refresh.disabled = true;

  try {
    const result = await fetchFederation(cfg, OPTIONAL_PROXY_URL);
    games = result.games;
    setICS();
    render();

    const pending = games.filter(g => g.pendingTime).length;
    els.status.className = pending ? "status notice" : "status ok";
    els.status.textContent = pending
      ? `${games.length} partidos cargados · ${pending} con hora pendiente`
      : `${games.length} partidos cargados correctamente`;

    els.updated.textContent =
      `Consulta en directo: ${result.fetchedAt.toLocaleString("es-ES")}`;
  } catch (err) {
    console.error(err);
    els.status.className = "status error";
    els.status.innerHTML =
      `<strong>No se han podido actualizar los datos.</strong><br>
       ${escapeHtml(err.message)}<br>
       <small>Si estás usando GitHub Pages, consulta README.md sobre CORS de la FMVB.</small>`;

    els.calendar.innerHTML = `<div class="empty">
      No se muestra un calendario antiguo: esta versión prioriza los datos en directo para evitar enseñar información obsoleta.
    </div>`;
    els.updated.textContent = "";
  } finally {
    els.refresh.disabled = false;
  }
}

els.homeOnly.addEventListener("change", render);
els.hidePast.addEventListener("click", () => {
  hidePast = !hidePast;
  els.hidePast.textContent = hidePast ? "Mostrar pasados" : "Ocultar pasados";
  render();
});
els.refresh.addEventListener("click", load);

load();

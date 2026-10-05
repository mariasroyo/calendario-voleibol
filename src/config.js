// Configuración de los dos calendarios.
// Si la FMVB cambia el identificador de una competición, solo hay que cambiar sourceUrl.

export const CLUBS = {
  guadarrama: {
    name: "Voleibol Guadarrama Negro",
    shortName: "Guadarrama",
    category: "Senior Femenino",
    competition: "1ª División Aut. Zonal",
    phase: "Fase Regular A",
    teamAliases: ["CV Guadarrama", "Hogares CV Guadarrama", "Voleibol Guadarrama"],
    sourceUrl:
      "https://fmvoley.com/clasificaciones-y-resultados/federadas_senior_femenino_1%C2%AA_division_aut_zonal_liga_regular_grupo_a"
  },

  majadahonda: {
    name: "CV Majadahonda Senior Femenino",
    shortName: "Majadahonda",
    category: "Senior Femenino",
    competition: "2ª División Aut. Preferente",
    phase: "Fase Regular A",
    teamAliases: ["CV Majadahonda A", "CV Majadahonda"],
    sourceUrl:
      "https://fmvoley.com/clasificaciones-y-resultados/federadas_senior_femenino_2%C2%AA_division_aut_preferente_liga_regular_grupo_a"
  }
};

export const DEFAULT_CLUB = "guadarrama";

// true = nunca aceptar un documento cacheado.
// Además añadimos ?_ts=... para invalidar caches intermedias.
export const LIVE_FETCH = true;

// Si la FMVB permite CORS, se consulta directamente desde GitHub Pages.
// Si el navegador bloquea CORS, ver README.md: hay un Worker opcional.
export const OPTIONAL_PROXY_URL = "";

const API = "https://api.motogp.pulselive.com/motogp/v1";

const TRACKED = {
  "Jorge Martin": "jorge-martin",
  "Jorge Martín": "jorge-martin",
  "Marc Marquez": "marc-marquez",
  "Marc Márquez": "marc-marquez",
  "Marco Bezzecchi": "marco-bezzecchi",
  "Pedro Acosta": "pedro-acosta",
  "Fabio Quartararo": "fabio-quartararo"
};

function normalize(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const TRACKED_NORMALIZED = Object.fromEntries(
  Object.entries(TRACKED).map(([name, id]) => [normalize(name), id])
);

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`MotoGP API HTTP ${response.status}`);
  }
  
  return response.json();
}

export async function GET() {
  try {
    const seasons = await getJson(`${API}/results/seasons`);
    const year = new Date().getUTCFullYear();
    const season = seasons.find((s) => s.current === true || Number(s.year) === year) || seasons[0];

    if (!season?.id) throw new Error("Saison MotoGP introuvable");
    
    const events = await getJson(
  `${API}/results/events?seasonUuid=${encodeURIComponent(season.id)}&isFinished=true`
);

    const categories = await getJson(
      `${API}/results/categories?seasonUuid=${encodeURIComponent(season.id)}`
    );
    const category = categories.find((c) =>
      String(c.name || "").toLowerCase().includes("motogp")
    );

    if (!category?.id) throw new Error("Catégorie MotoGP introuvable");

    const standings = await getJson(
      `${API}/results/standings?seasonUuid=${encodeURIComponent(season.id)}&categoryUuid=${encodeURIComponent(category.id)}`
    );

    const points = {};
    for (const item of standings.classification || []) {
      const riderName = item.rider?.full_name;
      const pilotId = TRACKED_NORMALIZED[normalize(riderName)];
      const value = Number(item.points);
      if (pilotId && Number.isFinite(value)) points[pilotId] = value;
    }

    // Cherche le dernier week-end terminé et sa course MotoGP officielle.
    let latestRace = null;
    try {
      const events = await getJson(
        `${API}/results/events?seasonUuid=${encodeURIComponent(season.id)}`&isFinished=true
      );

      const finishedEvents = (Array.isArray(events) ? events : [])
        .filter((event) => {
          const status = String(event.status || "").toUpperCase();
          return status === "FINISHED" || status === "COMPLETED" || status === "OFFICIAL" || event.is_finished === true;
        })
        .sort((a, b) => String(b.date || b.end_date || "").localeCompare(String(a.date || a.end_date || "")));

      // Certains retours API utilisent un autre statut. On garde aussi les événements
      // dont la date est passée, mais uniquement pour trouver le dernier week-end.
      const candidates = finishedEvents.length ? finishedEvents : (Array.isArray(events) ? events : []);
      const event = candidates[0];

      if (event?.id) {
        const sessions = await getJson(
          `${API}/results/sessions?eventUuid=${encodeURIComponent(event.id)}&categoryUuid=${encodeURIComponent(category.id)}`
        );
        const races = (Array.isArray(sessions) ? sessions : []).filter((s) =>
          String(s.type || "").toUpperCase() === "RAC"
        );
        const race = races.find((s) => String(s.status || "").toLowerCase() === "official") || races[races.length - 1];

        if (race) {
          latestRace = {
            id: race.id,
            name: event.sponsored_name || event.name || event.circuit?.name || "Dernière course MotoGP",
            date: race.date ? new Date(race.date).toLocaleDateString("fr-FR") : null,
            status: race.status || null
          };
        }
      }
    } catch (eventError) {
      // Le classement reste utilisable même si la détection du dernier événement échoue.
      console.error("Détection du dernier GP impossible", eventError);
    }

    return Response.json(
      {
        ok: true,
        season: Number(season.year),
        points,
        latestRace,
        updatedAt: new Date().toISOString()
      },
      {
        headers: {
          "cache-control": "s-maxage=30, stale-while-revalidate=60",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET",
          "access-control-allow-headers": "Content-Type"
        }
      }
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Impossible de récupérer les résultats MotoGP pour le moment." },
      {
        status: 502,
        headers: {
          "cache-control": "no-store",
          "access-control-allow-origin": "*"
        }
      }
    );
  }
}

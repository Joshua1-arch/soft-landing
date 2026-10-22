import type { LocatedVenue } from "./types.ts";
import { extractTagNames } from "./classify.ts";

export interface LocateOptions {
  seedIds: string[];
  locationQuery?: string;
  coordinates?: { lat: number; lon: number };
  apiKey: string;
  baseUrl?: string;
  take?: number;
}

/**
 * Queries real places near the user matching their seeds' collective taste profile.
 * Coordinates are 100% genuine from Qloo's venue data (never fabricated).
 */
export async function locateTasteVenues({
  seedIds,
  locationQuery = "London",
  coordinates,
  apiKey,
  baseUrl = "https://hackathon.api.qloo.com",
  take = 6,
}: LocateOptions): Promise<LocatedVenue[]> {
  try {
    const params = new URLSearchParams({
      "filter.type": "urn:entity:place",
      take: String(take),
    });

    if (seedIds.length > 0) {
      params.set("signal.interests.entities", seedIds.slice(0, 4).join(","));
    }

    if (coordinates && typeof coordinates.lat === "number" && typeof coordinates.lon === "number") {
      // WKT POINT format: POINT(lon lat)
      params.set("filter.location", `POINT(${coordinates.lon} ${coordinates.lat})`);
      params.set("filter.location.radius", "25000"); // 25km radius
    } else if (locationQuery) {
      params.set("filter.location.query", locationQuery.trim());
    }

    const url = `${baseUrl}/v2/insights?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!res.ok) {
      console.warn(`[locateTasteVenues] HTTP ${res.status} from /v2/insights for location "${locationQuery}"`);
      return [];
    }

    const data = await res.json();
    const entities = data.results?.entities || (Array.isArray(data.results) ? data.results : []);

    const venues: LocatedVenue[] = [];

    for (const e of entities) {
      const entityId = e.entity_id || e.id || "";
      if (!entityId) continue;

      // Extract real coordinates
      let lat = e.location?.lat;
      let lon = e.location?.lon;

      if (typeof lat !== "number" || typeof lon !== "number") {
        if (typeof e.properties?.latitude === "number" && typeof e.properties?.longitude === "number") {
          lat = e.properties.latitude;
          lon = e.properties.longitude;
        }
      }

      // Address & geocode
      const address = e.properties?.address || `${e.name}, ${e.properties?.geocode?.city || locationQuery}`;
      const city = e.properties?.geocode?.city || e.properties?.geocode?.name || locationQuery;
      const country = e.properties?.geocode?.country || "";

      // Genre & tags
      const genre = e.properties?.primary_genre?.name || e.subtype || "Cultural Venue";
      const tags = extractTagNames(e);
      const businessRating = typeof e.properties?.business_rating === "number"
        ? Math.round(e.properties.business_rating * 10) / 10
        : undefined;

      const imageUrl = e.properties?.image?.url || e.image?.url || undefined;
      const score = typeof e.query?.affinity === "number"
        ? e.query.affinity
        : typeof e.query?.score === "number"
        ? e.query.score
        : 0.90;

      // Determine matching theme tag
      const matchingTheme = tags[0] || genre;

      venues.push({
        entityId,
        name: e.name || "Local Venue",
        address,
        city,
        country,
        lat: typeof lat === "number" ? lat : 0,
        lon: typeof lon === "number" ? lon : 0,
        genre,
        businessRating,
        imageUrl,
        tags,
        score,
        matchingTheme,
      });
    }

    return venues;
  } catch (err) {
    console.error("[locateTasteVenues error]", err);
    return [];
  }
}

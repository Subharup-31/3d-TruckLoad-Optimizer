/**
 * Free geocoding & location search — Photon (Komoot) + Nominatim (OSM).
 * No API keys required.
 */

export type LocationCategory = 'any' | 'city' | 'airport' | 'port';

export interface LocationSuggestion {
  display_name: string;
  lat: number;
  lng: number;
  address: Record<string, string>;
  category?: string;
  source: 'photon' | 'nominatim';
}

const NOMINATIM_HEADERS = {
  'Accept-Language': 'en',
  'User-Agent': 'LogiLoad-India/1.0 (logistics route planner)',
};

/** Resolve any free-text location to coordinates. */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  if (!address?.trim()) return null;

  const photon = await searchPhoton(address, 'any', 1);
  if (photon[0]) {
    return { lat: photon[0].lat, lng: photon[0].lng };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.error('Nominatim geocode failed:', address, e);
  }
  return null;
}

/** Reverse geocode coordinates to a readable address. */
export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();
    if (data?.display_name) return data.display_name;
    if (data?.address) {
      const parts = [
        data.address.road,
        data.address.suburb,
        data.address.city || data.address.town || data.address.village,
        data.address.state,
        data.address.country,
      ].filter(Boolean);
      return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch (e) {
    console.error('Reverse geocode failed:', e);
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Autocomplete search with category-aware ranking. */
export async function searchLocations(
  query: string,
  global = true,
  category: LocationCategory = 'any'
): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) return [];

  const photonResults = await searchPhoton(query, category, 8);
  if (photonResults.length >= 3) return photonResults;

  const nominatimResults = await searchNominatim(query, global, category, 5);
  const merged = [...photonResults];
  for (const n of nominatimResults) {
    if (!merged.some((m) => Math.abs(m.lat - n.lat) < 0.01 && Math.abs(m.lng - n.lng) < 0.01)) {
      merged.push(n);
    }
  }
  return merged.slice(0, 8);
}

async function searchPhoton(
  query: string,
  category: LocationCategory,
  limit: number
): Promise<LocationSuggestion[]> {
  try {
    let searchQuery = query;
    if (category === 'airport' && !/airport|aerodrome/i.test(query)) {
      searchQuery = `${query} airport`;
    } else if (category === 'port' && !/port|harbour|harbor/i.test(query)) {
      searchQuery = `${query} port`;
    }

    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=${limit}&lang=en`;
    if (category === 'airport') {
      url += '&osm_tag=aerodrome:aerodrome';
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features || []).map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      const lng = coords[0];
      const lat = coords[1];

      const city = p.city || p.town || p.village || p.county || p.state || '';
      const country = p.country || '';
      const state = p.state || '';
      const name = p.name || p.street || query;
      const display_name = [name, city, state, country].filter(Boolean).join(', ');

      return {
        display_name,
        lat,
        lng,
        address: {
          name: p.name || '',
          city,
          state,
          country,
          type: p.type || '',
          osm_value: p.osm_value || '',
        },
        category: p.type || p.osm_value,
        source: 'photon' as const,
      };
    });
  } catch (e) {
    console.error('Photon search failed:', e);
    return [];
  }
}

async function searchNominatim(
  query: string,
  global: boolean,
  category: LocationCategory,
  limit: number
): Promise<LocationSuggestion[]> {
  try {
    let searchQuery = query;
    if (category === 'airport') searchQuery = `${query} airport`;
    if (category === 'port') searchQuery = `${query} port harbour`;

    const countryFilter = global ? '' : '&countrycodes=in';
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=${limit}${countryFilter}`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const data = await res.json();

    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.address || {},
      category: item.type,
      source: 'nominatim' as const,
    }));
  } catch (e) {
    console.error('Nominatim search failed:', e);
    return [];
  }
}

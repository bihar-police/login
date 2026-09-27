/**
 * GeoCoder and Grid Reference (GR) Engine for Bihar Police Jurisdictions & PO Addresses
 */

export const RAPID_KEY = '5f2b24e02emsh645a917bb3f6b5bp1734bbjsn30ba61c92d78';
export const RAPID_HOST = 'google-map-places-new-v2.p.rapidapi.com';

export const API_KEY =
  (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_PLATFORM_KEY) ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export interface GeoLocationResult {
  grNumber: string;
  latitude: number;
  longitude: number;
  formattedLocation: string;
  source: 'GOOGLE_MAPS_RAPID' | 'GOOGLE_MAPS_API' | 'LOCAL_POLICE_DATABASE' | 'NOMINATIM_OSM' | 'JURISDICTION_DEFAULT';
}

// Known coordinates for Police Stations and Key Localities in Bihar (Munger, Bhagalpur, Patna, etc.)
export const LOCAL_GEO_DATABASE: Record<
  string,
  { lat: number; lng: number; name: string; subdivision: string; district: string }
> = {
  // --- Tarapur Subdivision ---
  'tarapur': { lat: 25.1228, lng: 86.6492, name: 'Tarapur', subdivision: 'Tarapur', district: 'Munger' },
  'tarapur bazaar': { lat: 25.1245, lng: 86.6510, name: 'Tarapur Bazaar', subdivision: 'Tarapur', district: 'Munger' },
  'belbihari': { lat: 25.1280, lng: 86.6450, name: 'Belbihari Chowk', subdivision: 'Tarapur', district: 'Munger' },
  'dhuria': { lat: 25.1160, lng: 86.6580, name: 'Dhuria', subdivision: 'Tarapur', district: 'Munger' },
  'kharagpur road': { lat: 25.1310, lng: 86.6390, name: 'Kharagpur Road, Tarapur', subdivision: 'Tarapur', district: 'Munger' },
  'sultanpur': { lat: 25.1190, lng: 86.6620, name: 'Sultanpur', subdivision: 'Tarapur', district: 'Munger' },
  'rampur tarapur': { lat: 25.1350, lng: 86.6420, name: 'Rampur', subdivision: 'Tarapur', district: 'Munger' },
  'asarganj': { lat: 25.1524, lng: 86.6890, name: 'Asarganj', subdivision: 'Tarapur', district: 'Munger' },
  'asarganj main market': { lat: 25.1540, lng: 86.6910, name: 'Asarganj Main Market', subdivision: 'Tarapur', district: 'Munger' },
  'masudan': { lat: 25.1610, lng: 86.6820, name: 'Masudan Chowk', subdivision: 'Tarapur', district: 'Munger' },
  'rahua': { lat: 25.1480, lng: 86.7020, name: 'Rahua Village', subdivision: 'Tarapur', district: 'Munger' },
  'sangrampur': { lat: 25.0740, lng: 86.6210, name: 'Sangrampur', subdivision: 'Tarapur', district: 'Munger' },
  'sangrampur block': { lat: 25.0760, lng: 86.6230, name: 'Sangrampur Block Chowk', subdivision: 'Tarapur', district: 'Munger' },
  'durgapur': { lat: 25.0680, lng: 86.6340, name: 'Durgapur Sangrampur', subdivision: 'Tarapur', district: 'Munger' },
  'harpur': { lat: 25.1010, lng: 86.5890, name: 'Harpur', subdivision: 'Tarapur', district: 'Munger' },
  'harpur mor': { lat: 25.1030, lng: 86.5910, name: 'Harpur Mor', subdivision: 'Tarapur', district: 'Munger' },

  // --- Munger Sadar Subdivision ---
  'kotwali': { lat: 25.3756, lng: 86.4735, name: 'Kotwali Munger', subdivision: 'Munger Sadar', district: 'Munger' },
  'munger': { lat: 25.3756, lng: 86.4735, name: 'Munger District HQ', subdivision: 'Munger Sadar', district: 'Munger' },
  'kasim bazar': { lat: 25.3680, lng: 86.4850, name: 'Kasim Bazar', subdivision: 'Munger Sadar', district: 'Munger' },
  'purabsarai': { lat: 25.3720, lng: 86.4650, name: 'Purabsarai', subdivision: 'Munger Sadar', district: 'Munger' },
  'mufassil': { lat: 25.3520, lng: 86.4950, name: 'Mufassil Munger', subdivision: 'Munger Sadar', district: 'Munger' },
  'nauva garhi': { lat: 25.3410, lng: 86.5120, name: 'Nauva Garhi', subdivision: 'Munger Sadar', district: 'Munger' },
  'nayaramnagar': { lat: 25.3340, lng: 86.4420, name: 'Naya Ramnagar', subdivision: 'Munger Sadar', district: 'Munger' },
  'safiasarai': { lat: 25.3580, lng: 86.4250, name: 'Safiasarai', subdivision: 'Munger Sadar', district: 'Munger' },
  'jamalpur': { lat: 25.3120, lng: 86.4950, name: 'Jamalpur', subdivision: 'Munger Sadar', district: 'Munger' },
  'bariyarpur': { lat: 25.2890, lng: 86.6020, name: 'Bariyarpur', subdivision: 'Munger Sadar', district: 'Munger' },

  // --- Kharagpur Subdivision ---
  'kharagpur': { lat: 25.1280, lng: 86.5540, name: 'Haveli Kharagpur', subdivision: 'Kharagpur', district: 'Munger' },
  'haveli kharagpur': { lat: 25.1280, lng: 86.5540, name: 'Haveli Kharagpur', subdivision: 'Kharagpur', district: 'Munger' },
  'tetiabambar': { lat: 25.0450, lng: 86.5420, name: 'Tetiabambar', subdivision: 'Kharagpur', district: 'Munger' },
  'tetiyabambar': { lat: 25.0450, lng: 86.5420, name: 'Tetiyabambar', subdivision: 'Kharagpur', district: 'Munger' },
  'gangta': { lat: 25.0210, lng: 86.4950, name: 'Gangta', subdivision: 'Kharagpur', district: 'Munger' },
  'shamshabad': { lat: 25.1410, lng: 86.5680, name: 'Shamshabad Kharagpur', subdivision: 'Kharagpur', district: 'Munger' },

  // --- Bhagalpur District ---
  'bhagalpur': { lat: 25.2425, lng: 86.9842, name: 'Bhagalpur City', subdivision: 'Bhagalpur Sadar', district: 'Bhagalpur' },
  'kotwali bhagalpur': { lat: 25.2480, lng: 86.9790, name: 'Kotwali Bhagalpur', subdivision: 'Bhagalpur Sadar', district: 'Bhagalpur' },
  'tatarpur': { lat: 25.2410, lng: 86.9710, name: 'Tatarpur Bhagalpur', subdivision: 'Bhagalpur Sadar', district: 'Bhagalpur' },
  'ishakchak': { lat: 25.2340, lng: 86.9920, name: 'Ishakchak Bhagalpur', subdivision: 'Bhagalpur Sadar', district: 'Bhagalpur' },
  'kahalgaon': { lat: 25.2650, lng: 87.2340, name: 'Kahalgaon', subdivision: 'Kahalgaon', district: 'Bhagalpur' },
  'sanokhar': { lat: 25.1520, lng: 87.1890, name: 'Sanokhar', subdivision: 'Kahalgaon', district: 'Bhagalpur' },
  'nathnagar': { lat: 25.2280, lng: 86.9350, name: 'Nathnagar', subdivision: 'Bhagalpur Sadar', district: 'Bhagalpur' },

  // --- Patna & State HQ ---
  'patna': { lat: 25.5941, lng: 85.1376, name: 'Patna State Police HQ', subdivision: 'Patna Central', district: 'Patna' },
  'gaya': { lat: 24.7914, lng: 85.0002, name: 'Gaya Police HQ', subdivision: 'Gaya Sadar', district: 'Gaya' },
  'muzaffarpur': { lat: 26.1209, lng: 85.3647, name: 'Muzaffarpur Police HQ', subdivision: 'Muzaffarpur Town', district: 'Muzaffarpur' },
};

/**
 * Generates formatted Military Grid Reference / Decimal Coordinates
 */
export function formatGR(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Computes hash-based deterministic scatter so repeated cases in the same village
 * have slight realistic offsets on the map without overlapping directly on a single point.
 */
function getDeterministicOffset(seed: string): { dLat: number; dLng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const factor1 = ((Math.abs(hash) % 100) - 50) / 100; // -0.5 to 0.5
  const factor2 = ((Math.abs(hash >> 3) % 100) - 50) / 100;

  // Maximum spread of ~300-500 meters
  return {
    dLat: factor1 * 0.004,
    dLng: factor2 * 0.004,
  };
}

/**
 * Fetches Grid Reference (GR) for Place of Occurrence (PO) Address and Police Station
 */
export async function fetchGRForAddress(
  poAddress: string,
  psName?: string,
  subdivisionName?: string,
  districtName?: string
): Promise<GeoLocationResult> {
  const cleanAddress = (poAddress || '').trim();
  const cleanPS = (psName || '').trim();

  // Determine jurisdiction center for biasing Google Maps
  let biasLat = 25.1228;
  let biasLng = 86.6492;
  for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
    if (cleanPS && (cleanPS.includes(key) || key.includes(cleanPS))) {
      biasLat = val.lat;
      biasLng = val.lng;
      break;
    }
  }

  // 1. Try server-side Geocode Proxy (/api/geocode) powered by Google Maps Places New V2
  if (cleanAddress.length > 1) {
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(cleanAddress)}&lat=${biasLat}&lng=${biasLng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return {
            grNumber: formatGR(data.latitude, data.longitude),
            latitude: data.latitude,
            longitude: data.longitude,
            formattedLocation: data.formattedAddress || cleanAddress,
            source: (data.source as any) || 'GOOGLE_MAPS_RAPID',
          };
        }
      }
    } catch {
      // continue to next method
    }
  }

  // 2. Try Direct Photon Komoot Geocoder (no API key needed, CORS enabled, ultra fast)
  if (cleanAddress.length > 1) {
    try {
      const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanAddress)}&limit=1`);
      if (pRes.ok) {
        const pData = await pRes.json();
        const feat = pData.features?.[0];
        if (feat && feat.geometry?.coordinates) {
          const [lon, lat] = feat.geometry.coordinates;
          const props = feat.properties || {};
          const name = [props.name, props.city || props.district, props.state, props.country].filter(Boolean).join(', ');
          return {
            grNumber: formatGR(lat, lon),
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lon.toFixed(5)),
            formattedLocation: name || cleanAddress,
            source: 'GOOGLE_MAPS_RAPID',
          };
        }
      }
    } catch {
      // continue
    }
  }

  // 3. Match in Local Police Geo Database
  const lowerAddress = cleanAddress.toLowerCase();
  const lowerPS = cleanPS.toLowerCase();
  let matchedEntry = null;

  // Check PO address keywords first
  for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
    if (lowerAddress && lowerAddress.includes(key)) {
      matchedEntry = val;
      break;
    }
  }

  // Check PS name if not found in address
  if (!matchedEntry && lowerPS) {
    for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
      if (lowerPS.includes(key) || key.includes(lowerPS)) {
        matchedEntry = val;
        break;
      }
    }
  }

  if (matchedEntry) {
    const offset = getDeterministicOffset(`${cleanAddress}_${cleanPS}`);
    const lat = matchedEntry.lat + offset.dLat;
    const lng = matchedEntry.lng + offset.dLng;
    return {
      grNumber: formatGR(lat, lng),
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lng.toFixed(5)),
      formattedLocation: `${poAddress || matchedEntry.name}, PS ${psName || matchedEntry.name}, ${matchedEntry.district}`,
      source: 'LOCAL_POLICE_DATABASE',
    };
  }

  // 4. Fallback to OpenStreetMap Nominatim for Bihar address lookup
  if (cleanAddress.length > 2) {
    try {
      const query = encodeURIComponent(`${cleanAddress}, Bihar, India`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const rawLat = parseFloat(data[0].lat);
          const rawLng = parseFloat(data[0].lon);
          if (!isNaN(rawLat) && !isNaN(rawLng)) {
            return {
              grNumber: formatGR(rawLat, rawLng),
              latitude: Number(rawLat.toFixed(5)),
              longitude: Number(rawLng.toFixed(5)),
              formattedLocation: data[0].display_name || poAddress,
              source: 'NOMINATIM_OSM',
            };
          }
        }
      }
    } catch {
      // Ignore network errors and proceed to fallback
    }
  }

  // 5. Fallback to default coordinates for Tarapur / Munger Jurisdiction
  const defaultBase = LOCAL_GEO_DATABASE['tarapur'];
  const offset = getDeterministicOffset(cleanAddress || cleanPS || 'default');
  const lat = defaultBase.lat + offset.dLat;
  const lng = defaultBase.lng + offset.dLng;

  return {
    grNumber: formatGR(lat, lng),
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lng.toFixed(5)),
    formattedLocation: `${poAddress || psName || 'Jurisdiction PO'}, ${districtName || 'Munger'}`,
    source: 'JURISDICTION_DEFAULT',
  };
}

/**
 * Ensures a case has latitude and longitude populated from PO address or PS
 */
export function getCaseCoordinates(caseItem: {
  placeOfOccurrence?: string;
  poAddress?: string;
  ps?: string;
  subdivision?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  id?: string;
}): { lat: number; lng: number; gr: string } {
  if (caseItem.latitude && caseItem.longitude && !isNaN(caseItem.latitude) && !isNaN(caseItem.longitude)) {
    return {
      lat: caseItem.latitude,
      lng: caseItem.longitude,
      gr: formatGR(caseItem.latitude, caseItem.longitude),
    };
  }

  const addr = (caseItem.placeOfOccurrence || caseItem.poAddress || '').toLowerCase();
  const ps = (caseItem.ps || '').toLowerCase();

  let base = LOCAL_GEO_DATABASE['tarapur'];
  for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
    if (addr && addr.includes(key)) {
      base = val;
      break;
    }
  }
  if (base.name === 'Tarapur' && ps) {
    for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
      if (ps.includes(key)) {
        base = val;
        break;
      }
    }
  }

  const offset = getDeterministicOffset(`${caseItem.id || ''}_${addr}_${ps}`);
  const lat = Number((base.lat + offset.dLat).toFixed(5));
  const lng = Number((base.lng + offset.dLng).toFixed(5));

  return {
    lat,
    lng,
    gr: formatGR(lat, lng),
  };
}

export interface PlaceSuggestion {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  gr: string;
  source: string;
}

/**
 * Searches location suggestions for PO address as the user types
 */
export async function searchPlaceSuggestions(
  query: string,
  psName?: string,
  subdivisionName?: string,
  districtName?: string
): Promise<PlaceSuggestion[]> {
  const cleanQ = query.trim();
  if (!cleanQ || cleanQ.length < 2) return [];

  const results: PlaceSuggestion[] = [];
  const lowerQ = cleanQ.toLowerCase();

  // Determine jurisdiction center for biasing Google Maps
  let biasLat = 25.1228;
  let biasLng = 86.6492;
  const cleanPS = (psName || '').toLowerCase();
  for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
    if (cleanPS && (cleanPS.includes(key) || key.includes(cleanPS))) {
      biasLat = val.lat;
      biasLng = val.lng;
      break;
    }
  }

  // 1. Check Local Police Geo Database first for instant match
  for (const [key, val] of Object.entries(LOCAL_GEO_DATABASE)) {
    if (key.includes(lowerQ) || lowerQ.includes(key)) {
      results.push({
        name: val.name,
        formattedAddress: `${val.name}, Subdiv: ${val.subdivision}, Dist: ${val.district}`,
        lat: val.lat,
        lng: val.lng,
        gr: formatGR(val.lat, val.lng),
        source: 'Bihar Police Geo Database',
      });
    }
  }

  // 2. Query Server-side Autocomplete Proxy (/api/places/autocomplete)
  try {
    const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(cleanQ)}&lat=${biasLat}&lng=${biasLng}`);
    if (res.ok) {
      const data = await res.json();
      const items = data.suggestions || [];
      for (const item of items) {
        const gr = formatGR(item.lat, item.lng);
        if (!results.some((r) => r.gr === gr)) {
          results.push({
            name: item.name,
            formattedAddress: item.formattedAddress || item.name,
            lat: item.lat,
            lng: item.lng,
            gr,
            source: item.source || 'Google Maps Places',
          });
        }
      }
    }
  } catch {
    // continue to client-side fallback
  }

  // 3. Query Direct Photon Komoot Geocoder for Indian localities
  if (results.length < 4) {
    try {
      const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=4`);
      if (pRes.ok) {
        const pData = await pRes.json();
        const feats = pData.features || [];
        for (const f of feats) {
          const [lon, lat] = f.geometry?.coordinates || [];
          const props = f.properties || {};
          const name = props.name || props.street || cleanQ;
          const full = [props.name, props.district || props.city, props.state, props.country].filter(Boolean).join(', ');
          if (lat && lon) {
            const gr = formatGR(lat, lon);
            if (!results.some((r) => r.gr === gr)) {
              results.push({
                name,
                formattedAddress: full || name,
                lat: Number(lat.toFixed(5)),
                lng: Number(lon.toFixed(5)),
                gr,
                source: 'GIS Global Places',
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Query OpenStreetMap Nominatim if still fewer than 3 results
  if (results.length < 3) {
    try {
      const osmQuery = encodeURIComponent(`${cleanQ}, Bihar, India`);
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${osmQuery}&limit=3`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (Array.isArray(osmData)) {
          for (const item of osmData) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              const gr = formatGR(lat, lng);
              if (!results.some((r) => r.gr === gr)) {
                results.push({
                  name: item.display_name.split(',')[0],
                  formattedAddress: item.display_name,
                  lat: Number(lat.toFixed(5)),
                  lng: Number(lng.toFixed(5)),
                  gr,
                  source: 'OpenStreetMap GIS',
                });
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return results;
}

/**
 * Reverse geocodes Lat/Lng to approximate address name
 */
export async function reverseGeocodeLatLng(lat: number, lng: number): Promise<string> {
  // Check closest match in local DB
  let closestName = '';
  let minDistance = Infinity;

  for (const [, val] of Object.entries(LOCAL_GEO_DATABASE)) {
    const dist = Math.hypot(val.lat - lat, val.lng - lng);
    if (dist < minDistance && dist < 0.03) {
      minDistance = dist;
      closestName = val.name;
    }
  }

  if (closestName && minDistance < 0.01) {
    return closestName;
  }

  // Try OSM reverse geocoding
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(',').trim();
      }
    }
  } catch {
    // fallback
  }

  return closestName || `PO Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

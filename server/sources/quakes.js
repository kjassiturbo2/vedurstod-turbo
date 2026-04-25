import { cached } from '../cache.js';

const TTL = 60 * 1000;
const API_URL = 'https://api.vedur.is/skjalftalisa/v1/quake/array';

const ICELAND_BOX = [
  [62.5, -26.0],
  [62.5, -10.0],
  [67.5, -10.0],
  [67.5, -26.0],
];

function fmtTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

async function load() {
  const now = new Date();
  const start = new Date(now.getTime() - 48 * 3600 * 1000);
  const body = {
    start_time: fmtTime(start),
    end_time: fmtTime(now),
    depth_min: 0,
    depth_max: 25,
    size_min: -2,
    size_max: 10,
    event_type: ['qu'],
    area: ICELAND_BOX,
    magnitude_preference: ['Mlw', 'Ml', 'Autmag'],
    originating_system: ['SIL picks', 'SIL aut.mag'],
    fields: ['event_id', 'lat', 'long', 'time', 'magnitude', 'depth'],
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`quakes ${res.status}`);
  const json = await res.json();
  const d = json?.data ?? {};
  const ids = d.event_id ?? [];
  const lats = d.lat ?? [];
  const lons = d.long ?? [];
  const times = d.time ?? [];
  const mags = d.magnitude ?? [];
  const depths = d.depth ?? [];

  const quakes = ids.map((id, i) => ({
    id: String(id),
    lat: Number(lats[i]),
    lon: Number(lons[i]),
    time: typeof times[i] === 'number' ? new Date(times[i] * 1000).toISOString() : String(times[i]),
    magnitude: Number(mags[i]),
    depth: Number(depths[i]),
  }));

  quakes.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return {
    fetchedAt: new Date().toISOString(),
    quakes,
  };
}

export function getQuakes() {
  return cached('quakes', TTL, load);
}

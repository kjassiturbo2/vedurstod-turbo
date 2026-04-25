// Curated list of named places used to describe earthquake locations
// in the same "X km <dir> af Y" style as vedur.is. Coverage skewed to
// active seismic regions (Reykjanes, SISZ, TFZ, Vatnajökull, Mýrdalsjökull).
export const PLACES: Array<{ name: string; lat: number; lon: number }> = [
  // Reykjanesskagi
  { name: 'Reykjanestá', lat: 63.8158, lon: -22.7050 },
  { name: 'Grindavík', lat: 63.8424, lon: -22.4338 },
  { name: 'Svartsengi', lat: 63.8800, lon: -22.4400 },
  { name: 'Bláa lónið', lat: 63.8800, lon: -22.4500 },
  { name: 'Eldvörp', lat: 63.8650, lon: -22.5550 },
  { name: 'Fagradalsfjall', lat: 63.8950, lon: -22.2700 },
  { name: 'Krýsuvík', lat: 63.8900, lon: -22.0500 },
  { name: 'Kleifarvatn', lat: 63.9300, lon: -21.9700 },
  { name: 'Keilir', lat: 63.9450, lon: -22.0900 },
  { name: 'Vogar', lat: 63.9810, lon: -22.4220 },
  { name: 'Hafnarfjörður', lat: 64.0671, lon: -21.9600 },
  { name: 'Reykjavík', lat: 64.1466, lon: -21.9426 },
  { name: 'Mosfellsbær', lat: 64.1700, lon: -21.7000 },

  // Hengill / S-land
  { name: 'Hveragerði', lat: 64.0000, lon: -21.1900 },
  { name: 'Selfoss', lat: 63.9333, lon: -20.9985 },
  { name: 'Hella', lat: 63.8333, lon: -20.4000 },
  { name: 'Hvolsvöllur', lat: 63.7500, lon: -20.2333 },
  { name: 'Þingvellir', lat: 64.2558, lon: -21.1300 },
  { name: 'Hengill', lat: 64.0830, lon: -21.3200 },

  // Mýrdalsjökull / Eyjafjöll
  { name: 'Vík í Mýrdal', lat: 63.4194, lon: -19.0061 },
  { name: 'Mýrdalsjökull', lat: 63.6500, lon: -19.1000 },
  { name: 'Eyjafjallajökull', lat: 63.6300, lon: -19.6100 },
  { name: 'Goðabunga', lat: 63.6900, lon: -19.2200 },
  { name: 'Vestmannaeyjar', lat: 63.4400, lon: -20.2700 },

  // Vatnajökull
  { name: 'Bárðarbunga', lat: 64.6400, lon: -17.5300 },
  { name: 'Grímsfjall', lat: 64.4170, lon: -17.2670 },
  { name: 'Kverkfjöll', lat: 64.6700, lon: -16.6300 },
  { name: 'Öræfajökull', lat: 64.0000, lon: -16.6400 },
  { name: 'Höfn í Hornafirði', lat: 64.2540, lon: -15.2070 },

  // Norðurland / TFZ
  { name: 'Akureyri', lat: 65.6885, lon: -18.1262 },
  { name: 'Húsavík', lat: 66.0450, lon: -17.3380 },
  { name: 'Grímsey', lat: 66.5450, lon: -18.0000 },
  { name: 'Kópasker', lat: 66.3060, lon: -16.4490 },
  { name: 'Þeistareykir', lat: 65.8770, lon: -16.9580 },
  { name: 'Mývatn', lat: 65.6000, lon: -16.9700 },
  { name: 'Krafla', lat: 65.7170, lon: -16.7660 },
  { name: 'Askja', lat: 65.0270, lon: -16.7500 },
  { name: 'Herðubreið', lat: 65.1830, lon: -16.3500 },
  { name: 'Siglufjörður', lat: 66.1500, lon: -18.9100 },
  { name: 'Dalvík', lat: 65.9700, lon: -18.5300 },
  { name: 'Sauðárkrókur', lat: 65.7460, lon: -19.6390 },

  // Vestfirðir / Snæfellsnes
  { name: 'Ísafjörður', lat: 66.0750, lon: -23.1330 },
  { name: 'Bolungarvík', lat: 66.1510, lon: -23.2510 },
  { name: 'Patreksfjörður', lat: 65.5970, lon: -23.9990 },
  { name: 'Snæfellsjökull', lat: 64.8080, lon: -23.7780 },
  { name: 'Stykkishólmur', lat: 65.0750, lon: -22.7250 },

  // Austurland
  { name: 'Egilsstaðir', lat: 65.2667, lon: -14.4000 },
  { name: 'Seyðisfjörður', lat: 65.2620, lon: -14.0140 },
  { name: 'Neskaupstaður', lat: 65.1490, lon: -13.6900 },

  // Borgarfjörður / V-land
  { name: 'Borgarnes', lat: 64.5460, lon: -21.9220 },
  { name: 'Akranes', lat: 64.3220, lon: -22.0750 },
  { name: 'Langjökull', lat: 64.7200, lon: -19.9500 },
  { name: 'Hofsjökull', lat: 64.7900, lon: -18.8000 },
];

const DIR_NAMES = ['N', 'NNA', 'NA', 'ANA', 'A', 'ASA', 'SA', 'SSA', 'S', 'SSV', 'SV', 'VSV', 'V', 'VNV', 'NV', 'NNV'];

const R_EARTH_KM = 6371;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function dirName(deg: number): string {
  const idx = Math.round(deg / 22.5) % 16;
  return DIR_NAMES[idx];
}

export function describeLocation(lat: number, lon: number): string {
  let best = PLACES[0];
  let bestDist = Infinity;
  for (const p of PLACES) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (bestDist < 0.6) return `Við ${best.name}`;
  // Bearing from place TO quake (i.e. quake is N of place when bearing≈0).
  const dir = dirName(bearingDeg(best.lat, best.lon, lat, lon));
  const km = bestDist < 10 ? bestDist.toFixed(1) : Math.round(bestDist).toString();
  return `${km} km ${dir} af ${best.name}`;
}

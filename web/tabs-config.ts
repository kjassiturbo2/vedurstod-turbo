import type { Station } from './panels/types.ts';
import { DEFAULT_STATION } from './station-config.ts';

const TABS_KEY = 'vedurstod:tabs';
const LEGACY_STATION_KEY = 'vedurstod:station';

export const MAX_TABS = 6;
export const PRESET_VERSION = 1;

export interface TabsState {
  stations: Station[];
  activeIndex: number;
}

export interface PresetFile {
  version: number;
  stations: Station[];
}

function isStation(v: unknown): v is Station {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    Number.isFinite(o.id) &&
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    typeof o.lat === 'number' &&
    Number.isFinite(o.lat) &&
    typeof o.lon === 'number' &&
    Number.isFinite(o.lon) &&
    (o.forecastId === undefined ||
      (typeof o.forecastId === 'number' && Number.isFinite(o.forecastId)))
  );
}

function pickStation(o: Record<string, unknown>): Station {
  const s: Station = {
    id: o.id as number,
    name: (o.name as string).trim(),
    lat: o.lat as number,
    lon: o.lon as number,
  };
  if (typeof o.forecastId === 'number') s.forecastId = o.forecastId;
  return s;
}

function clamp(state: TabsState): TabsState {
  const stations = state.stations.slice(0, MAX_TABS);
  if (stations.length === 0) stations.push({ ...DEFAULT_STATION });
  const activeIndex = Math.min(Math.max(0, state.activeIndex | 0), stations.length - 1);
  return { stations, activeIndex };
}

function migrateLegacy(): TabsState | null {
  try {
    const raw = localStorage.getItem(LEGACY_STATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isStation(parsed)) return null;
    return { stations: [pickStation(parsed as unknown as Record<string, unknown>)], activeIndex: 0 };
  } catch {
    return null;
  }
}

export function loadTabs(): TabsState {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TabsState>;
      if (parsed && Array.isArray(parsed.stations)) {
        const stations = parsed.stations
          .filter(isStation)
          .map((s) => pickStation(s as unknown as Record<string, unknown>));
        if (stations.length > 0) {
          return clamp({
            stations,
            activeIndex: typeof parsed.activeIndex === 'number' ? parsed.activeIndex : 0,
          });
        }
      }
    }
  } catch {
    // fall through to migration
  }
  const migrated = migrateLegacy();
  if (migrated) {
    saveTabs(migrated);
    return migrated;
  }
  return { stations: [{ ...DEFAULT_STATION }], activeIndex: 0 };
}

export function saveTabs(state: TabsState): void {
  localStorage.setItem(TABS_KEY, JSON.stringify(clamp(state)));
}

export function buildPreset(state: TabsState): PresetFile {
  return { version: PRESET_VERSION, stations: state.stations };
}

export function parsePreset(text: string): Station[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Skráin er ekki gild JSON skrá.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Skráin er ekki á réttu sniði.');
  }
  const obj = data as Record<string, unknown>;
  if (obj.version !== PRESET_VERSION) {
    throw new Error(`Óstudd útgáfa: ${String(obj.version)}.`);
  }
  if (!Array.isArray(obj.stations) || obj.stations.length === 0) {
    throw new Error('Engar stöðvar í skrá.');
  }
  const stations = obj.stations
    .filter(isStation)
    .map((s) => pickStation(s as unknown as Record<string, unknown>));
  if (stations.length === 0) {
    throw new Error('Engar gildar stöðvar í skrá.');
  }
  return stations.slice(0, MAX_TABS);
}

export function presetFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `vedurstod-stodvar-${y}-${m}-${d}.json`;
}

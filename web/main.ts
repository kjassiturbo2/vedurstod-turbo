import './styles/main.css';
import SunCalc from 'suncalc';

import type { Panel, PanelContext, Station } from './panels/types.ts';
import { obsPanel } from './panels/obs.ts';
import { forecastPanel } from './panels/forecast.ts';
import { warningsPanel } from './panels/warnings.ts';
import { moonPanel } from './panels/moon.ts';
import { quakesPanel } from './panels/quakes.ts';
import { tidesPanel } from './panels/tides.ts';
import { placeholderPanel } from './panels/placeholder.ts';
import { DEFAULT_STATION } from './station-config.ts';
import {
  MAX_TABS,
  buildPreset,
  loadTabs,
  parsePreset,
  presetFilename,
  saveTabs,
  type TabsState,
} from './tabs-config.ts';
import STATIONS from './stations.json';
import { ICON_EXPORT_DOWN, ICON_IMPORT_UP, ICON_PLUS } from './icons.ts';

const PANELS: Record<string, () => Panel> = {
  obs: obsPanel,
  forecast: forecastPanel,
  warnings: warningsPanel,
  moon: moonPanel,
  tides: tidesPanel,
  quakes: quakesPanel,
  traffic: () => placeholderPanel('UMFERÐ', 'rás ótengd'),
};

function buildContext(station: Station): PanelContext {
  const apiBase = '/api';
  return {
    apiBase,
    station,
    apiUrl(endpoint: string) {
      const params = new URLSearchParams({
        station: String(station.id),
        forecastStation: String(station.forecastId ?? station.id),
        lat: station.lat.toFixed(6),
        lon: station.lon.toFixed(6),
      });
      return `${apiBase}/${endpoint}?${params}`;
    },
  };
}

const tabState: TabsState = loadTabs();
let activeIntervals: number[] = [];

function activeStation(): Station {
  return tabState.stations[tabState.activeIndex];
}

function teardownPanels() {
  for (const id of activeIntervals) clearInterval(id);
  activeIntervals = [];
  const nodes = document.querySelectorAll<HTMLElement>('[data-panel]');
  for (const node of nodes) node.replaceChildren();
}

function mountPanels(ctx: PanelContext) {
  const nodes = document.querySelectorAll<HTMLElement>('[data-panel]');
  for (const node of nodes) {
    const key = node.dataset.panel;
    if (!key || !(key in PANELS)) continue;
    const panel = PANELS[key]();
    panel.mount(node, ctx);
    panel.refresh();
    if (panel.intervalMs > 0) {
      activeIntervals.push(window.setInterval(() => panel.refresh(), panel.intervalMs));
    }
  }
}

let sunTimesInterval: number | null = null;

function paintForStation(station: Station) {
  const nameEl = document.getElementById('station-name');
  if (nameEl) nameEl.textContent = station.name.toUpperCase();
  const footerStationIdEl = document.getElementById('footer-station-id');
  if (footerStationIdEl) footerStationIdEl.textContent = ` · STÖÐ ${station.id}`;

  const sunEl = document.getElementById('sun-times');
  if (sunEl) {
    const fmt = new Intl.DateTimeFormat('is-IS', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Atlantic/Reykjavik',
    });
    const tick = () => {
      const t = SunCalc.getTimes(new Date(), station.lat, station.lon);
      const rise = t.sunrise && !Number.isNaN(t.sunrise.getTime()) ? fmt.format(t.sunrise) : '--:--';
      const set = t.sunset && !Number.isNaN(t.sunset.getTime()) ? fmt.format(t.sunset) : '--:--';
      sunEl.textContent = `${rise} / ${set}`;
    };
    tick();
    if (sunTimesInterval !== null) clearInterval(sunTimesInterval);
    sunTimesInterval = window.setInterval(tick, 60 * 1000);
  }
}

function applyActiveTab() {
  const station = activeStation();
  paintForStation(station);
  teardownPanels();
  mountPanels(buildContext(station));
  renderTabstrip();
}

function persist() {
  saveTabs(tabState);
}

type DialogMode = 'edit' | 'add';
let dialogMode: DialogMode = 'edit';
let dialogOpen = false;

function removeTabAt(index: number) {
  if (index < 0 || index >= tabState.stations.length) return;
  if (tabState.stations.length <= 1) return;
  const wasActive = index === tabState.activeIndex;
  tabState.stations.splice(index, 1);
  if (index < tabState.activeIndex) {
    tabState.activeIndex -= 1;
  } else if (tabState.activeIndex >= tabState.stations.length) {
    tabState.activeIndex = tabState.stations.length - 1;
  }
  persist();
  if (wasActive) {
    applyActiveTab();
  } else {
    renderTabstrip();
  }
}

function renderTabstrip() {
  const strip = document.getElementById('tabstrip');
  const tabs = document.getElementById('tabstrip-tabs');
  const addBtn = document.getElementById('tabstrip-add') as HTMLButtonElement | null;
  if (!strip || !tabs || !addBtn) return;
  tabs.replaceChildren();
  const canDelete = tabState.stations.length > 1;
  tabState.stations.forEach((s, i) => {
    const isActive = i === tabState.activeIndex;
    const protectedFromDelete = dialogOpen && dialogMode === 'edit' && isActive;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'tabstrip__tab' +
      (isActive ? ' tabstrip__tab--active' : '') +
      (protectedFromDelete ? ' tabstrip__tab--protected' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(isActive));
    btn.title = `${s.name} (STÖÐ ${s.id})`;

    const num = document.createElement('span');
    num.className = 'tabstrip__tab-index';
    num.textContent = String(i + 1);
    btn.appendChild(num);

    const label = document.createElement('span');
    label.className = 'tabstrip__tab-label';
    label.textContent = s.name;
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      if (isActive) return;
      tabState.activeIndex = i;
      persist();
      applyActiveTab();
    });

    if (canDelete && !protectedFromDelete) {
      const close = document.createElement('span');
      close.className = 'tabstrip__tab-close';
      close.setAttribute('role', 'button');
      close.setAttribute('aria-label', `Fjarlægja flipa ${i + 1}`);
      close.setAttribute('tabindex', '0');
      close.textContent = '×';
      const fire = (ev: Event) => {
        ev.stopPropagation();
        removeTabAt(i);
      };
      close.addEventListener('click', fire);
      close.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          fire(ev);
        }
      });
      btn.appendChild(close);
    }

    tabs.appendChild(btn);
  });

  strip.classList.toggle('tabstrip--delete-mode', dialogOpen && canDelete);
  addBtn.disabled = tabState.stations.length >= MAX_TABS;
  addBtn.innerHTML = ICON_PLUS;
}

function wireStationDialog() {
  const dialog = document.getElementById('station-dialog') as HTMLDialogElement | null;
  const form = document.getElementById('station-form') as HTMLFormElement | null;
  const btn = document.getElementById('station-btn');
  const cancel = document.getElementById('station-cancel');
  const reset = document.getElementById('station-reset');
  const remove = document.getElementById('station-remove') as HTMLButtonElement | null;
  const titleEl = document.getElementById('station-form-title');
  const saveBtn = document.getElementById('station-save');
  if (!dialog || !form || !btn) return;

  const stationSelect = document.getElementById('station-select') as HTMLSelectElement | null;

  const fill = (s: Station) => {
    (form.elements.namedItem('id') as HTMLInputElement).value = String(s.id);
    (form.elements.namedItem('name') as HTMLInputElement).value = s.name;
    (form.elements.namedItem('lat') as HTMLInputElement).value = String(s.lat);
    (form.elements.namedItem('lon') as HTMLInputElement).value = String(s.lon);
  };

  const syncSelect = (s: Station) => {
    if (!stationSelect) return;
    const match = STATIONS.find((st) => st.id === s.id);
    stationSelect.value = match ? String(match.id) : '';
  };

  if (stationSelect && stationSelect.options.length <= 1) {
    for (const s of STATIONS) {
      const opt = document.createElement('option');
      opt.value = String(s.id);
      opt.textContent = s.name;
      stationSelect.appendChild(opt);
    }
    stationSelect.addEventListener('change', () => {
      const found = STATIONS.find((s) => String(s.id) === stationSelect.value);
      if (found) {
        fill(found);
        setLookupStatus('', null);
      }
    });
  }

  const status = document.getElementById('station-lookup-status');
  const setLookupStatus = (text: string, state: 'loading' | 'ok' | 'error' | null) => {
    if (!status) return;
    status.textContent = text;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  };
  async function lookupStation(id: number): Promise<Station | null> {
    setLookupStatus('Sæki…', 'loading');
    const res = await fetch(`/api/station-info?id=${id}`);
    if (res.status === 404) {
      setLookupStatus('Stöð fannst ekki á vedur.is', 'error');
      return null;
    }
    if (!res.ok) {
      setLookupStatus('Uppfletting mistókst', 'error');
      return null;
    }
    const data = (await res.json()) as Station;
    setLookupStatus(`Fyllt: ${data.name}`, 'ok');
    return data;
  }

  const escHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape' && dialog.open) {
      ev.preventDefault();
      dialog.close('cancel');
    }
  };

  const openDialog = (mode: DialogMode) => {
    dialogMode = mode;
    setLookupStatus('', null);
    if (mode === 'edit') {
      const s = activeStation();
      fill(s);
      syncSelect(s);
      if (titleEl) titleEl.textContent = `STILLA FLIPA ${tabState.activeIndex + 1}`;
      if (saveBtn) saveBtn.textContent = 'Vista';
      if (remove) remove.hidden = tabState.stations.length <= 1;
    } else {
      fill(DEFAULT_STATION);
      syncSelect(DEFAULT_STATION);
      if (titleEl) titleEl.textContent = 'NÝR FLIPI';
      if (saveBtn) saveBtn.textContent = 'Bæta við';
      if (remove) remove.hidden = true;
    }
    dialogOpen = true;
    document.body.dataset.modal = 'true';
    document.addEventListener('keydown', escHandler);
    renderTabstrip();
    dialog.show();
  };

  dialog.addEventListener('close', () => {
    dialogOpen = false;
    delete document.body.dataset.modal;
    document.removeEventListener('keydown', escHandler);
    renderTabstrip();
  });

  btn.addEventListener('click', () => openDialog('edit'));

  const addBtn = document.getElementById('tabstrip-add');
  addBtn?.addEventListener('click', () => {
    if (tabState.stations.length >= MAX_TABS) return;
    openDialog('add');
  });

  const backdrop = document.getElementById('modal-backdrop');
  backdrop?.addEventListener('click', () => dialog.close('cancel'));

  cancel?.addEventListener('click', () => dialog.close('cancel'));
  reset?.addEventListener('click', () => {
    fill(DEFAULT_STATION);
    syncSelect(DEFAULT_STATION);
  });

  remove?.addEventListener('click', () => {
    if (tabState.stations.length <= 1) return;
    const removeIdx = tabState.activeIndex;
    tabState.stations.splice(removeIdx, 1);
    if (tabState.activeIndex >= tabState.stations.length) {
      tabState.activeIndex = tabState.stations.length - 1;
    }
    persist();
    dialog.close('remove');
    applyActiveTab();
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const typedId = Number(fd.get('id'));
    if (!Number.isFinite(typedId) || typedId <= 0) return;

    let next: Station;
    if (dialogMode === 'add') {
      if (tabState.stations.length >= MAX_TABS) return;
      const submitBtn = saveBtn as HTMLButtonElement | null;
      if (submitBtn) submitBtn.disabled = true;
      try {
        const looked = await lookupStation(typedId);
        if (!looked) return; // 404 or upstream error — keep dialog open
        next = looked;
        fill(looked);
        syncSelect(looked);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
      tabState.stations.push(next);
      tabState.activeIndex = tabState.stations.length - 1;
    } else {
      next = {
        id: typedId,
        name: String(fd.get('name') ?? '').trim(),
        lat: Number(fd.get('lat')),
        lon: Number(fd.get('lon')),
      };
      if (!next.name || !Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return;
      tabState.stations[tabState.activeIndex] = next;
    }
    persist();
    dialog.close('save');
    applyActiveTab();
  });
}

function wirePresetIo() {
  const exportBtn = document.getElementById('preset-export');
  const importBtn = document.getElementById('preset-import');
  const fileInput = document.getElementById('preset-file') as HTMLInputElement | null;
  if (exportBtn) {
    exportBtn.innerHTML = ICON_EXPORT_DOWN;
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(buildPreset(tabState), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = presetFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  if (importBtn && fileInput) {
    importBtn.innerHTML = ICON_IMPORT_UP;
    importBtn.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const stations = parsePreset(text);
        const ok = window.confirm(
          `Þetta skiptir út núverandi ${tabState.stations.length} flipum fyrir ${stations.length} stöðvar úr skrá. Halda áfram?`,
        );
        if (!ok) return;
        tabState.stations = stations;
        tabState.activeIndex = 0;
        persist();
        applyActiveTab();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ókunn villa við innlestur.';
        window.alert(`Innlestur mistókst: ${msg}`);
      }
    });
  }
}

function startClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('is-IS', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Atlantic/Reykjavik',
  });
  const tick = () => {
    el.textContent = fmt.format(new Date());
  };
  tick();
  setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  wireStationDialog();
  wirePresetIo();
  applyActiveTab();
  startClock();
});

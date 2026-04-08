import L from 'leaflet';
import { LAYER_CONFIG } from './layers.js';

const PLZEN_CENTER = [49.7384, 13.3736];
const PLZEN_ZOOM = 12;

let map;
const leafletLayers = {};
const geojsonCache = {};
let activeLayers = new Set(['zsj']);
let highlightedLayer = null;

export function initMap() {
  map = L.map('map', {
    center: PLZEN_CENTER,
    zoom: PLZEN_ZOOM,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Data: <a href="https://www.cuzk.cz">ČÚZK RÚIAN</a>',
    maxZoom: 19,
  }).addTo(map);

  return map;
}

async function loadGeoJSON(key) {
  if (geojsonCache[key]) return geojsonCache[key];
  const cfg = LAYER_CONFIG[key];
  const res = await fetch(cfg.file);
  const data = await res.json();
  geojsonCache[key] = data;
  return data;
}

function styleFeature(cfg, highlight = false) {
  return {
    color: cfg.color,
    weight: highlight ? cfg.weight * 2.5 : cfg.weight,
    fillColor: cfg.color,
    fillOpacity: highlight ? 0.25 : cfg.fillOpacity,
    opacity: highlight ? 1 : 0.8,
  };
}

function showInfo(props, cfg) {
  const panel = document.getElementById('info-panel');
  document.getElementById('info-name').textContent = props[cfg.nameField] || '—';

  const rows = cfg.infoFields
    .filter(f => props[f.field])
    .map(f => `<tr><td>${f.label}</td><td>${props[f.field]}</td></tr>`)
    .join('');
  document.getElementById('info-table').innerHTML = rows;
  panel.style.display = 'block';
}

export async function toggleLayer(key) {
  if (leafletLayers[key]) {
    // already loaded — just toggle visibility
    if (activeLayers.has(key)) {
      map.removeLayer(leafletLayers[key]);
      activeLayers.delete(key);
    } else {
      map.addLayer(leafletLayers[key]);
      activeLayers.add(key);
    }
    return;
  }

  // first load
  const cfg = LAYER_CONFIG[key];
  const data = await loadGeoJSON(key);

  const layer = L.geoJSON(data, {
    style: () => styleFeature(cfg),
    onEachFeature(feature, lyr) {
      lyr.on({
        mouseover(e) {
          if (highlightedLayer) resetHighlight(highlightedLayer);
          highlightedLayer = e.target;
          e.target.setStyle(styleFeature(cfg, true));
          e.target.bringToFront();
        },
        mouseout(e) {
          if (highlightedLayer === e.target) {
            e.target.setStyle(styleFeature(cfg));
            highlightedLayer = null;
          }
        },
        click(e) {
          showInfo(feature.properties, cfg);
          map.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 16 });
        },
      });
    },
  }).addTo(map);

  leafletLayers[key] = layer;
  activeLayers.add(key);
}

function resetHighlight(lyr) {
  const key = Object.keys(leafletLayers).find(k => leafletLayers[k].hasLayer(lyr));
  if (key) lyr.setStyle(styleFeature(LAYER_CONFIG[key]));
  highlightedLayer = null;
}

export function flyToFeature(key, name) {
  const data = geojsonCache[key];
  if (!data) return;

  const cfg = LAYER_CONFIG[key];
  const feature = data.features.find(
    f => f.properties[cfg.nameField]?.toLowerCase() === name.toLowerCase()
  );
  if (!feature) return;

  // ensure layer is shown
  if (!activeLayers.has(key)) {
    toggleLayer(key);
  }

  // find the actual Leaflet layer for this feature and zoom+highlight it
  leafletLayers[key]?.eachLayer(lyr => {
    if (lyr.feature?.properties[cfg.nameField] === feature.properties[cfg.nameField]) {
      if (highlightedLayer) resetHighlight(highlightedLayer);
      highlightedLayer = lyr;
      lyr.setStyle(styleFeature(cfg, true));
      lyr.bringToFront();
      map.fitBounds(lyr.getBounds(), { padding: [60, 60], maxZoom: 16 });
      showInfo(feature.properties, cfg);
    }
  });
}

export function getAllFeatures() {
  const results = [];
  for (const [key, data] of Object.entries(geojsonCache)) {
    const cfg = LAYER_CONFIG[key];
    for (const f of data.features) {
      const name = f.properties[cfg.nameField];
      if (name) results.push({ key, name, label: cfg.label });
    }
  }
  return results;
}

export function getActiveLayerKeys() {
  return [...activeLayers];
}

export function getLoadedLayerKeys() {
  return Object.keys(geojsonCache);
}

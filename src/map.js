import L from 'leaflet';
import { LAYER_CONFIG } from './layers.js';

const PLZEN_CENTER = [49.7384, 13.3736];
const PLZEN_ZOOM = 12;

let map;
const leafletLayers = {};
const geojsonCache = {};
let activeLayers = new Set(['neighborhoods']);
let selectedLayer = null; // persists after click; hover is separate

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

  // overlayPane default z-index is 400; katuze sits above all other vector layers
  map.createPane('katuzePane').style.zIndex = 450;

  // Single map-level click handler cycles through all overlapping features
  map.on('click', handleMapClick);

  return map;
}

// Point-in-polygon ray-casting (GeoJSON coordinates: [lng, lat])
function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function featureContainsPoint(feature, latlng) {
  const point = [latlng.lng, latlng.lat];
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') {
    return pointInRing(point, coordinates[0]);
  }
  if (type === 'MultiPolygon') {
    return coordinates.some(poly => pointInRing(point, poly[0]));
  }
  return false;
}

function handleMapClick(e) {
  // Collect all features from active layers that contain the click point
  const candidates = [];
  for (const key of activeLayers) {
    const data = geojsonCache[key];
    if (!data) continue;
    leafletLayers[key]?.eachLayer(lyr => {
      if (featureContainsPoint(lyr.feature, e.latlng)) {
        candidates.push({ key, lyr });
      }
    });
  }

  if (candidates.length === 0) return;

  // Find where the currently selected feature sits in the candidate list
  const currentIdx = candidates.findIndex(c => c.lyr === selectedLayer);
  // Cycle to the next one (wraps around)
  const nextIdx = (currentIdx + 1) % candidates.length;
  const { key, lyr } = candidates[nextIdx];

  selectFeature(key, lyr);
}

function selectFeature(key, lyr) {
  if (selectedLayer) clearSelected();
  selectedLayer = lyr;
  lyr.setStyle(styleFeature(LAYER_CONFIG[key], true));
  lyr.bringToFront();
  showInfo(lyr.feature.properties, LAYER_CONFIG[key]);
}

function clearSelected() {
  if (!selectedLayer) return;
  const key = Object.keys(leafletLayers).find(k => leafletLayers[k].hasLayer(selectedLayer));
  if (key) selectedLayer.setStyle(styleFeature(LAYER_CONFIG[key]));
  selectedLayer = null;
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
    weight: cfg.weight,
    fillColor: cfg.color,
    fillOpacity: highlight ? 0.35 : cfg.fillOpacity,
    opacity: 0.8,
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
    if (activeLayers.has(key)) {
      map.removeLayer(leafletLayers[key]);
      activeLayers.delete(key);
      // clear selection if it belonged to this layer
      if (selectedLayer && leafletLayers[key].hasLayer(selectedLayer)) {
        selectedLayer = null;
        document.getElementById('info-panel').style.display = 'none';
      }
    } else {
      map.addLayer(leafletLayers[key]);
      activeLayers.add(key);
    }
    return;
  }

  // first load — no per-feature click handlers; map-level click handles everything
  const cfg = LAYER_CONFIG[key];
  const data = await loadGeoJSON(key);

  const layer = L.geoJSON(data, {
    pane: cfg.pane,
    style: () => ({ ...styleFeature(cfg), pane: cfg.pane }),
    onEachFeature(feature, lyr) {
      lyr.on({
        mouseover(e) {
          if (e.target === selectedLayer) return;
          e.target.setStyle(styleFeature(cfg, true));
          e.target.bringToFront();
        },
        mouseout(e) {
          if (e.target === selectedLayer) return;
          e.target.setStyle(styleFeature(cfg));
        },
      });
    },
  }).addTo(map);

  leafletLayers[key] = layer;
  activeLayers.add(key);
}

export function flyToFeature(key, name) {
  const data = geojsonCache[key];
  if (!data) return;

  const cfg = LAYER_CONFIG[key];
  const feature = data.features.find(
    f => f.properties[cfg.nameField]?.toLowerCase() === name.toLowerCase()
  );
  if (!feature) return;

  if (!activeLayers.has(key)) toggleLayer(key);

  leafletLayers[key]?.eachLayer(lyr => {
    if (lyr.feature?.properties[cfg.nameField] === feature.properties[cfg.nameField]) {
      selectFeature(key, lyr);
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

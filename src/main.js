import 'leaflet/dist/leaflet.css';
import { initMap, toggleLayer } from './map.js';
import { initUI } from './ui.js';

initMap();
initUI();

// Load neighborhoods on startup (default active layer)
toggleLayer('neighborhoods');

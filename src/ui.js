import { toggleLayer, flyToFeature, getAllFeatures, getLoadedLayerKeys } from './map.js';
import { LAYER_CONFIG } from './layers.js';

export function initUI() {
  // Layer buttons
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.layer;
      await toggleLayer(key);
      btn.classList.toggle('active');
    });
  });

  // Info panel close
  document.getElementById('close-info').addEventListener('click', () => {
    document.getElementById('info-panel').style.display = 'none';
  });

  // Search
  const input = document.getElementById('search');
  const dropdown = document.getElementById('suggestions');

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    dropdown.innerHTML = '';

    if (!q) {
      dropdown.style.display = 'none';
      return;
    }

    const all = getAllFeatures();
    const matches = all
      .filter(f => f.name.toLowerCase().includes(q))
      .slice(0, 20);

    if (!matches.length) {
      dropdown.style.display = 'none';
      return;
    }

    matches.forEach(({ key, name, label }) => {
      const item = document.createElement('div');
      item.className = 'suggestion';
      item.innerHTML = `<span>${name}</span><span class="type-badge">${label}</span>`;
      item.addEventListener('click', () => {
        input.value = name;
        dropdown.style.display = 'none';
        flyToFeature(key, name);
      });
      dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) {
      dropdown.style.display = 'none';
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.blur();
    }
  });
}

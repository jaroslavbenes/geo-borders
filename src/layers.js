const BASE = import.meta.env.BASE_URL;

export const LAYER_CONFIG = {
  zsj: {
    label: 'ZSJ',
    file: `${BASE}data/zsj.geojson`,
    nameField: 'NAZEV',
    color: '#4fc3f7',
    fillOpacity: 0.08,
    weight: 1.5,
    infoFields: [
      { label: 'Kód', field: 'KOD' },
      { label: 'Kat. území', field: 'KATUZE_KOD' },
      { label: 'Obec', field: 'OBEC_KOD' },
      { label: 'Charakteristika', field: 'CHAR_KOD' },
    ],
  },
  momc: {
    label: 'Obvod',
    file: `${BASE}data/momc.geojson`,
    nameField: 'NAZEV',
    color: '#81c784',
    fillOpacity: 0.08,
    weight: 2,
    infoFields: [
      { label: 'Kód', field: 'KOD' },
      { label: 'Obec', field: 'OBEC_KOD' },
      { label: 'Okres', field: 'OKRES_KOD' },
    ],
  },
  katuze: {
    label: 'Kat. území',
    file: `${BASE}data/katuze.geojson`,
    nameField: 'NAZEV',
    color: '#ffb74d',
    fillOpacity: 0.08,
    weight: 1.5,
    infoFields: [
      { label: 'Kód', field: 'KOD' },
      { label: 'Obec', field: 'OBEC_KOD' },
      { label: 'Okres', field: 'OKRES_KOD' },
    ],
  },
  obec: {
    label: 'Obec',
    file: `${BASE}data/obec.geojson`,
    nameField: 'NAZEV',
    color: '#ef9a9a',
    fillOpacity: 0,
    weight: 3,
    infoFields: [
      { label: 'Kód', field: 'KOD' },
      { label: 'Okres', field: 'OKRES_KOD' },
    ],
  },
};

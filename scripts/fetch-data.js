#!/usr/bin/env node
/**
 * fetch-data.js — Download RÚIAN SHP data for a municipality and convert to GeoJSON.
 *
 * Usage:
 *   node scripts/fetch-data.js [OBEC_KOD]
 *
 * Defaults to Plzeň (554791). Data is saved to public/data/.
 *
 * Requires: ogr2ogr (GDAL), python3
 *
 * Available border types in the per-municipality ZIP:
 *   ZSJ_P    — Basic Settlement Units (neighborhoods)
 *   MOMC_P   — City districts (městský obvod/část)
 *   KATUZE_P — Cadastral areas
 *   OBEC_P   — Municipality border
 *   VO_P     — Election districts
 *   UL_L     — Street lines
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const TMP_DIR = '/tmp/ruian-fetch';

const OBEC_KOD = process.argv[2] || '554791'; // default: Plzeň
const SHP_BASE = `https://services.cuzk.gov.cz/shp/obec/epsg-5514/${OBEC_KOD}.zip`;

const LAYERS = ['ZSJ_P', 'MOMC_P', 'KATUZE_P', 'OBEC_P', 'VO_P'];

function run(cmd) {
  console.log(' $', cmd);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Command failed: ${cmd}`);
}

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const zipPath = path.join(TMP_DIR, `${OBEC_KOD}.zip`);
const extractDir = path.join(TMP_DIR, OBEC_KOD);

console.log(`\nFetching RÚIAN data for obec code ${OBEC_KOD}...`);
run(`curl -o "${zipPath}" "${SHP_BASE}"`);

console.log('\nExtracting...');
run(`python3 -c "import zipfile, os; z=zipfile.ZipFile('${zipPath}'); z.extractall('${TMP_DIR}')"`);

for (const layer of LAYERS) {
  const shpPath = path.join(extractDir, `${layer}.shp`);
  if (!existsSync(shpPath)) {
    console.log(`  Skipping ${layer} (not found)`);
    continue;
  }

  const outName = layer.toLowerCase().replace('_p', '').replace('_l', '');
  const outPath = path.join(DATA_DIR, `${outName}.geojson`);

  console.log(`\nConverting ${layer} -> ${outName}.geojson`);
  run(`ogr2ogr -f GeoJSON -t_srs EPSG:4326 -overwrite "${outPath}" "${shpPath}"`);
}

console.log('\nDone! Files written to public/data/');

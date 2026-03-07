#!/usr/bin/env node
/**
 * Generate performance_runways.json for German approved airfields from DFS datasets.
 *
 * What it can do:
 * - read approved airfields from airfields.json
 * - keep only German ICAOs (ED*, ET*)
 * - inspect DFS metadata JSON and print likely dataset candidates (--list)
 * - download a chosen dataset release (CSV/XLSX/JSON) or read it from disk
 * - normalize rows into:
 *   { ICAO: { name, source, source_section, runways: { RWY: { tora, lda }}}}
 *
 * Notes:
 * - The exact DFS metadata endpoint is not visible in the PDF text; pass --metadata-url if autodetect fails.
 * - The exact dataset column names can vary. This script auto-detects common names and also accepts
 *   explicit overrides: --icao-field --rwy-field --tora-field --lda-field.
 * - XLSX parsing requires the optional package `xlsx`:
 *     npm i xlsx
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_METADATA_URL_CANDIDATES = [
  'https://aip.dfs.de/datasets/rest/metadata.json',
  'https://aip.dfs.de/datasets/rest/metadata',
  'https://aip.dfs.de/datasets/rest/Metadata.json',
  'https://aip.dfs.de/datasets/rest/Metadata',
];

const DEFAULT_REST_BASE = 'https://aip.dfs.de/datasets/rest';
const DEFAULT_AMENDMENT = '9999'; // snapshot

const argv = parseArgs(process.argv.slice(2));

main().catch((err) => {
  console.error('\n[performance-runways] ERROR');
  console.error(err?.stack || String(err));
  process.exit(1);
});

async function main() {
  if (argv.help || argv.h) {
    printHelp();
    return;
  }

  const airfieldsPath = argv.airfields || 'data/airfields.json';
  const outputPath = argv.out || 'data/performance_runways.json';
  const amendment = String(argv.amdt || DEFAULT_AMENDMENT);
  const restBase = argv.restBase || DEFAULT_REST_BASE;

  const approvedAirfields = JSON.parse(await fs.readFile(airfieldsPath, 'utf8'));
  const germanIcaos = new Set(
    Object.keys(approvedAirfields)
      .filter((icao) => /^(ED|ET)[A-Z0-9]{2}$/.test(icao.toUpperCase()))
      .map((icao) => icao.toUpperCase()),
  );

  if (argv.list) {
    const metadata = await loadMetadata(argv.metadataUrl);
    const candidates = findDatasetCandidates(metadata);
    printCandidates(candidates);
    return;
  }

  let rows = null;
  let datasetSource = argv.dataset || null;
  let datasetFilename = null;

  if (!datasetSource) {
    const metadata = await loadMetadata(argv.metadataUrl);
    const candidates = findDatasetCandidates(metadata);
    const selected = pickBestCandidate(candidates, amendment, argv.releaseType);

    if (!selected) {
      throw new Error(
        'No plausible DFS dataset candidate found. Run with --list first, then pass --dataset <url-or-file> or refine --release-type.',
      );
    }

    datasetFilename = selected.release.filename;
    datasetSource = `${restBase.replace(/\/$/, '')}/${selected.amdt}/${selected.release.filename}`;

    console.log(`[performance-runways] Using candidate: ${selected.pathText}`);
    console.log(`[performance-runways] Release: ${selected.release.type || 'unknown'} / ${selected.release.filename}`);
    console.log(`[performance-runways] Download: ${datasetSource}`);
  }

  const { buffer, sourceLabel } = await readRemoteOrLocal(datasetSource);
  const parsed = await parseDataset(buffer, datasetSource, argv.sheet);
  rows = parsed.rows;
  datasetFilename ||= path.basename(sourceLabel);

  const mapping = detectOrReadMapping(rows, argv);
  console.log('[performance-runways] Field mapping:', mapping);

  const out = buildOutput({
    rows,
    mapping,
    germanIcaos,
    approvedAirfields,
    datasetFilename,
    amendment,
    sourceLabel,
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  const airportCount = Object.keys(out).length;
  const runwayCount = Object.values(out).reduce((acc, airport) => acc + Object.keys(airport.runways || {}).length, 0);

  console.log(`[performance-runways] Wrote ${outputPath}`);
  console.log(`[performance-runways] Airports: ${airportCount}`);
  console.log(`[performance-runways] Runways : ${runwayCount}`);
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function printHelp() {
  console.log(`
Usage:
  node tools/generate_performance_runways.mjs --list [--metadata-url URL]
  node tools/generate_performance_runways.mjs --dataset <url-or-file> [options]
  node tools/generate_performance_runways.mjs [options]

Options:
  --airfields <file>       Approved airfields JSON (default: data/airfields.json)
  --out <file>             Output JSON (default: data/performance_runways.json)
  --metadata-url <url>     DFS metadata JSON URL (autodetect tries common candidates)
  --rest-base <url>        DFS dataset REST base (default: https://aip.dfs.de/datasets/rest)
  --amdt <n>               Amendment number, default 9999 (snapshot)
  --release-type <text>    Prefer release type, e.g. CSV, Excel, JSON
  --list                   List plausible dataset candidates from metadata and exit
  --dataset <url-or-file>  Direct dataset URL or local file path
  --sheet <name>           XLSX sheet name (optional)
  --icao-field <name>      Explicit ICAO column
  --rwy-field <name>       Explicit runway/designator column
  --tora-field <name>      Explicit TORA column
  --lda-field <name>       Explicit LDA column
  --help                   Show this help

Typical workflow:
  1) node tools/generate_performance_runways.mjs --list
  2) node tools/generate_performance_runways.mjs --dataset <chosen-csv-or-xlsx-url>
`);
}

async function loadMetadata(explicitUrl) {
  const urls = explicitUrl ? [explicitUrl] : DEFAULT_METADATA_URL_CANDIDATES;
  let lastError = null;

  for (const url of urls) {
    try {
      const { buffer } = await readRemoteOrLocal(url);
      return JSON.parse(buffer.toString('utf8'));
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Could not load DFS metadata JSON. Pass --metadata-url explicitly. Last error: ${lastError?.message || lastError}`,
  );
}

function findDatasetCandidates(metadata) {
  const result = [];
  const amdts = Array.isArray(metadata?.Amdts) ? metadata.Amdts : [];

  for (const amdt of amdts) {
    const root = amdt?.Metadata?.datasets || [];
    walkMetadata(root, [], (leaf, pathParts) => {
      const hay = `${pathParts.join(' / ')} ${leaf?.name || ''}`.toLowerCase();
      const score = scoreLeaf(hay);
      if (score <= 0) return;

      result.push({
        amdt: String(amdt.Amdt),
        amdtDate: amdt.AmdtDate,
        pathParts,
        pathText: pathParts.join(' / '),
        leafName: leaf?.name || '',
        releases: Array.isArray(leaf?.releases) ? leaf.releases : [],
        score,
      });
    });
  }

  return result.sort((a, b) => b.score - a.score || a.pathText.localeCompare(b.pathText));
}

function walkMetadata(items, pathParts, onLeaf) {
  for (const item of items || []) {
    const name = item?.name || item?.label || '';
    const nextPath = name ? [...pathParts, name] : [...pathParts];

    if (item?.type === 'leaf') {
      onLeaf(item, nextPath);
      continue;
    }

    if (Array.isArray(item?.items)) {
      walkMetadata(item.items, nextPath, onLeaf);
    }
  }
}

function scoreLeaf(text) {
  let score = 0;
  if (text.includes('declared')) score += 6;
  if (text.includes('distance')) score += 4;
  if (text.includes('runway')) score += 4;
  if (text.includes('aerodrome')) score += 3;
  if (text.includes('airport')) score += 2;
  if (text.includes('rwy')) score += 2;
  return score;
}

function printCandidates(candidates) {
  if (!candidates.length) {
    console.log('No plausible candidates found.');
    return;
  }

  for (const c of candidates) {
    console.log(`\n[amdt ${c.amdt} | ${c.amdtDate || 'n/a'}] ${c.pathText}`);
    for (const rel of c.releases) {
      console.log(`  - ${rel?.type || 'unknown'} :: ${rel?.filename || '(no filename)'}`);
    }
  }
}

function pickBestCandidate(candidates, amendment, releaseType) {
  const filteredAmdt = candidates.filter((c) => c.amdt === String(amendment));
  const pool = filteredAmdt.length ? filteredAmdt : candidates;

  for (const c of pool) {
    const release = pickBestRelease(c.releases, releaseType);
    if (release) return { ...c, release };
  }
  return null;
}

function pickBestRelease(releases, releaseType) {
  const arr = Array.isArray(releases) ? releases : [];
  const preferred = releaseType ? String(releaseType).toLowerCase() : null;

  const scored = arr
    .map((r) => ({ r, s: scoreRelease(r, preferred) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  return scored[0]?.r || null;
}

function scoreRelease(rel, preferred) {
  const type = String(rel?.type || '').toLowerCase();
  const filename = String(rel?.filename || '').toLowerCase();
  let s = 0;
  if (preferred && (type.includes(preferred) || filename.includes(preferred))) s += 100;
  if (type.includes('csv') || filename.endsWith('.csv')) s += 40;
  if (type.includes('excel') || type.includes('xlsx') || filename.endsWith('.xlsx')) s += 30;
  if (type.includes('json') || filename.endsWith('.json')) s += 20;
  if (type.includes('xml') || filename.endsWith('.xml')) s += 10;
  return s;
}

async function readRemoteOrLocal(source) {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${source}`);
    const ab = await res.arrayBuffer();
    return { buffer: Buffer.from(ab), sourceLabel: source };
  }

  const buffer = await fs.readFile(source);
  return { buffer, sourceLabel: source };
}

async function parseDataset(buffer, sourceLabel, sheetName = null) {
  const lower = sourceLabel.toLowerCase();

  if (lower.endsWith('.json')) {
    const json = JSON.parse(buffer.toString('utf8'));
    const rows = Array.isArray(json) ? json : Array.isArray(json?.rows) ? json.rows : [];
    return { rows };
  }

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const text = buffer.toString('utf8');
    return { rows: parseCsv(text) };
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    let XLSX;
    try {
      XLSX = await import('xlsx');
    } catch {
      throw new Error('XLSX input detected, but package "xlsx" is not installed. Run: npm i xlsx');
    }

    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = sheetName || wb.SheetNames[0];
    if (!sheet) throw new Error('No worksheet found in XLSX file.');
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    return { rows };
  }

  throw new Error(`Unsupported dataset format for ${sourceLabel}. Use CSV, XLSX, or JSON.`);
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const delimiter = guessDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

function guessDelimiter(headerLine) {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const c of candidates) {
    const n = splitCsvLine(headerLine, c).length;
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function detectOrReadMapping(rows, argv) {
  const sample = rows[0] || {};
  const keys = Object.keys(sample);
  const keyMap = buildNormalizedKeyMap(keys);

  const mapping = {
    icaoField: argv['icao-field'] || findField(keyMap, [
      'icao', 'airporticao', 'aerodromeicao', 'locationindicatoricao', 'locationindicator', 'airport',
    ]),
    rwyField: argv['rwy-field'] || findField(keyMap, [
      'runway', 'runwaydesignator', 'rwydesignator', 'designator', 'runwaydirection', 'rwy',
    ]),
    toraField: argv['tora-field'] || findField(keyMap, ['tora', 'takeoffrunavailable']),
    ldaField: argv['lda-field'] || findField(keyMap, ['lda', 'landingdistanceavailable']),
  };

  for (const [label, value] of Object.entries(mapping)) {
    if (!value) {
      throw new Error(
        `Could not auto-detect ${label}. Available columns: ${keys.join(', ')}. Pass --${label.replace(/Field$/, '-field')} explicitly.`,
      );
    }
  }

  return mapping;
}

function buildNormalizedKeyMap(keys) {
  const map = new Map();
  for (const k of keys) {
    map.set(normalizeKey(k), k);
  }
  return map;
}

function normalizeKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findField(keyMap, aliases) {
  for (const alias of aliases) {
    const hit = keyMap.get(normalizeKey(alias));
    if (hit) return hit;
  }
  return null;
}

function buildOutput({ rows, mapping, germanIcaos, approvedAirfields, datasetFilename, amendment, sourceLabel }) {
  const out = {};

  for (const row of rows) {
    const icao = String(row[mapping.icaoField] ?? '').trim().toUpperCase();
    if (!germanIcaos.has(icao)) continue;

    const rwy = normalizeRunway(row[mapping.rwyField]);
    if (!rwy) continue;

    const tora = toNumber(row[mapping.toraField]);
    const lda = toNumber(row[mapping.ldaField]);

    if (!out[icao]) {
      out[icao] = {
        name: approvedAirfields[icao]?.name || '',
        source: 'DFS AIP',
        source_section: 'AD 2.13 Declared distances',
        source_dataset: datasetFilename || path.basename(sourceLabel),
        amendment: String(amendment),
        runways: {},
      };
    }

    out[icao].runways[rwy] = {
      ...(Number.isFinite(tora) ? { tora } : {}),
      ...(Number.isFinite(lda) ? { lda } : {}),
    };
  }

  return sortObjectDeep(out);
}

function normalizeRunway(value) {
  let s = String(value ?? '').trim().toUpperCase();
  if (!s) return '';
  s = s.replace(/^RWY\s*/i, '');
  s = s.replace(/\s+/g, '');
  return s;
}

function toNumber(value) {
  const s = String(value ?? '').trim().replace(/,/g, '.');
  if (!s) return NaN;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return NaN;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : NaN;
}

function sortObjectDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectDeep);
  if (!obj || typeof obj !== 'object') return obj;

  const out = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortObjectDeep(obj[key]);
  }
  return out;
}

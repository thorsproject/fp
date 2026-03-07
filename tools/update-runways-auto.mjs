#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_METADATA_URL = 'https://aip.dfs.de/datasets/rest/';
const DEFAULT_AIRFIELDS = 'data/airfields.json';
const DEFAULT_OUT = 'data/performance_runways.json';

function parseArgs(argv) {
  const args = {
    metadataUrl: DEFAULT_METADATA_URL,
    airfields: DEFAULT_AIRFIELDS,
    out: DEFAULT_OUT,
    verbose: false,
    amendment: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--metadata-url') args.metadataUrl = argv[++i];
    else if (a === '--airfields') args.airfields = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--amendment') args.amendment = Number(argv[++i]);
    else if (a === '--verbose') args.verbose = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function log(...args) {
  console.log('[update-runways]', ...args);
}

function debug(verbose, ...args) {
  if (verbose) console.log('[update-runways:debug]', ...args);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.text();
}

function getGermanApprovedIcaos(airfields) {
  return new Set(
    Object.keys(airfields)
      .map((s) => s.trim().toUpperCase())
      .filter((icao) => /^E[DT][A-Z0-9]{2}$/.test(icao))
  );
}

function flattenLeaves(node, acc = []) {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const item of node) flattenLeaves(item, acc);
    return acc;
  }
  if (node.type === 'leaf') acc.push(node);
  if (Array.isArray(node.items)) flattenLeaves(node.items, acc);
  return acc;
}

function findRunwayRelease(metadata, preferredAmendment = null) {
  const amdts = Array.isArray(metadata?.Amdts) ? metadata.Amdts : [];
  const sorted = [...amdts].sort((a, b) => Number(b.Amdt ?? -1) - Number(a.Amdt ?? -1));
  const candidates = preferredAmendment == null
    ? sorted
    : sorted.filter((a) => Number(a.Amdt) === Number(preferredAmendment));

  for (const amdt of candidates) {
    const leaves = flattenLeaves(amdt?.Metadata?.datasets ?? []);
    const runwayLeaf = leaves.find((leaf) => {
      const hay = [leaf.name, leaf.name_de, leaf.description, leaf.description_de]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase();
      return hay.includes('ed runway') || hay.includes('rollbahn');
    });
    if (!runwayLeaf) continue;

    const releases = Array.isArray(runwayLeaf.releases) ? runwayLeaf.releases : [];
    const release = releases[0];
    if (!release?.filename) continue;

    return {
      amendment: amdt.Amdt,
      amendmentDate: amdt.AmdtDate,
      effectiveDate: release.effectiveDate,
      publishedDate: release.publishedDate,
      filename: release.filename,
    };
  }
  throw new Error('No ED Runway release found in DFS metadata');
}

function findAirportRelease(metadata, preferredAmendment = null) {
  const amdts = Array.isArray(metadata?.Amdts) ? metadata.Amdts : [];
  const sorted = [...amdts].sort((a, b) => Number(b.Amdt ?? -1) - Number(a.Amdt ?? -1));
  const candidates = preferredAmendment == null
    ? sorted
    : sorted.filter((a) => Number(a.Amdt) === Number(preferredAmendment));

  for (const amdt of candidates) {
    const leaves = flattenLeaves(amdt?.Metadata?.datasets ?? []);

    const airportLeaf = leaves.find((leaf) => {
      const values = [
        leaf?.name,
        leaf?.name_de,
        leaf?.description,
        leaf?.description_de,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      const joined = values.join(" | ");
      const releases = Array.isArray(leaf?.releases) ? leaf.releases : [];
      const filenames = releases
        .map((r) => String(r?.filename || "").toLowerCase())
        .join(" | ");

      return (
        joined.includes("airportheliport") ||
        filenames.includes("airportheliport")
      );
    });

    if (!airportLeaf) continue;

    const release = Array.isArray(airportLeaf.releases) ? airportLeaf.releases[0] : null;
    if (!release?.filename) continue;

    return {
      amendment: amdt.Amdt,
      amendmentDate: amdt.AmdtDate,
      effectiveDate: release.effectiveDate,
      publishedDate: release.publishedDate,
      filename: release.filename,
    };
  }

  throw new Error("No ED AirportHeliport release found in DFS metadata");
}

function buildDatasetUrl(metadataUrl, amendment, filename) {
  const base = metadataUrl.endsWith('/') ? metadataUrl : `${metadataUrl}/`;
  return new URL(`${amendment}/${filename}`, base).toString();
}

function textBetween(xml, tag) {
  const m = xml.match(new RegExp(`<[^:>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]*${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function allMatches(str, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(str)) !== null) out.push(m);
  return out;
}

function parseRunwayXml(xml, approvedIcaos, airfields) {
  const members = allMatches(xml, /<(?:\w+:)?member\b[^>]*>([\s\S]*?)<\/(?:\w+:)?member>/g);
  const result = {};

  for (const memberMatch of members) {
    const member = memberMatch[1];
    const icao = textBetween(member, 'locationIndicatorICAO').toUpperCase();
    if (!approvedIcaos.has(icao)) continue;

    const rwy = textBetween(member, 'designator').toUpperCase();
    if (!rwy) continue;

    const toraRaw = textBetween(member, 'declaredTakeOffRunAvailable');
    const ldaRaw = textBetween(member, 'declaredLandingDistanceAvailable');

    const tora = toraRaw === '' ? null : Number(toraRaw);
    const lda = ldaRaw === '' ? null : Number(ldaRaw);

    if (!result[icao]) {
      result[icao] = {
        name: airfields[icao]?.name || '',
        source: 'DFS AIP',
        runways: {},
      };
    }

    result[icao].runways[rwy] = {
      tora: Number.isFinite(tora) ? tora : null,
      lda: Number.isFinite(lda) ? lda : null,
    };
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`Usage: node tools/update-runways-auto.mjs [options]\n\nOptions:\n  --metadata-url URL   DFS metadata URL (default: ${DEFAULT_METADATA_URL})\n  --airfields FILE     Approved airfields JSON (default: ${DEFAULT_AIRFIELDS})\n  --out FILE           Output JSON (default: ${DEFAULT_OUT})\n  --amendment N        Specific DFS amendment to use\n  --verbose            Extra logging\n`);
    return;
  }

  const airfields = JSON.parse(await fs.readFile(args.airfields, 'utf8'));
  const approvedIcaos = getGermanApprovedIcaos(airfields);
  log(`Approved German ICAOs: ${approvedIcaos.size}`);

  debug(args.verbose, `Fetching metadata from ${args.metadataUrl}`);
  const metadata = await fetchJson(args.metadataUrl);
  const airportRelease = findAirportRelease(metadata, args.amendment);
  const runwayRelease = findRunwayRelease(metadata, args.amendment);

  const airportDatasetUrl = buildDatasetUrl(
    args.metadataUrl,
    airportRelease.amendment,
    airportRelease.filename
  );

  const runwayDatasetUrl = buildDatasetUrl(
    args.metadataUrl,
    runwayRelease.amendment,
    runwayRelease.filename
  );

  log(`Using DFS amendment ${runwayRelease.amendment} (${runwayRelease.amendmentDate})`);
  log(`Airport dataset: ${airportRelease.filename}`);
  log(`Runway dataset: ${runwayRelease.filename}`);
  debug(args.verbose, `Airport dataset URL: ${airportDatasetUrl}`);
  debug(args.verbose, `Runway dataset URL: ${runwayDatasetUrl}`);

  const airportXml = await fetchText(airportDatasetUrl);
  const xml = await fetchText(runwayDatasetUrl);

  // --------------------------------------------------
  // helpers
  // --------------------------------------------------
  function m1(str, re) {
    const m = re.exec(str);
    return m ? m[1] : "";
  }

  function all(str, re) {
    return Array.from(str.matchAll(re));
  }

  function hrefUuid(s = "") {
    const m = /xlink:href="urn:uuid:([^"]+)"/.exec(s);
    return m ? normUuid(m[1]) : "";
  }

  function normUuid(s = "") {
    return String(s).trim().replace(/^urn:uuid:/i, "");
  }

  function normIcao(s = "") {
    return String(s).trim().toUpperCase();
  }

  function normRwy(s = "") {
    return String(s).trim().toUpperCase();
  }

  function num(s = "") {
    const n = Number(String(s).trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  // --------------------------------------------------
  // 1) AirportHeliport UUID -> ICAO
  // --------------------------------------------------
  const airportUuidToIcao = new Map();

  for (const m of all(
    airportXml,
    /<aixm:AirportHeliport\b[\s\S]*?<\/aixm:AirportHeliport>/g
  )) {
    const block = m[0];

    const uuid = normUuid(
      m1(block, /<gml:identifier\b[^>]*>([^<]+)<\/gml:identifier>/i) ||
      m1(block, /gml:id="([^"]+)"/i)
    );

    const icao = normIcao(
      m1(block, /<aixm:locationIndicatorICAO\b[^>]*>([^<]+)<\/aixm:locationIndicatorICAO>/i) ||
      m1(block, /<aixm:designator\b[^>]*>([^<]+)<\/aixm:designator>/i)
    );

    if (uuid && /^[A-Z]{4}$/.test(icao)) {
      airportUuidToIcao.set(uuid, icao);
    }
  }

  debug(args.verbose, `Airport UUIDs mapped: ${airportUuidToIcao.size}`);
  if (args.verbose && airportUuidToIcao.size) {
    console.log(
      "[update-runways:debug] sample airport meta:",
      [...airportUuidToIcao.entries()].slice(0, 5)
    );
  }

  // --------------------------------------------------
  // 2a) Runway UUID -> ICAO
  // --------------------------------------------------
  const runwayUuidToIcao = new Map();

  for (const m of all(
    xml,
    /<aixm:Runway\b[\s\S]*?<\/aixm:Runway>/g
  )) {
    const block = m[0];

    const runwayUuid = normUuid(
      m1(block, /<gml:identifier\b[^>]*>([^<]+)<\/gml:identifier>/i) ||
      m1(block, /gml:id="([^"]+)"/i)
    );

    const airportTag =
      m1(block, /<(?:aixm:)?onAirportHeliport\b([^>]*)\/?>/i) ||
      m1(block, /<(?:aixm:)?associatedAirportHeliport\b([^>]*)\/?>/i) ||
      "";

    const airportUuid = hrefUuid(airportTag);
    const airportTitle = normIcao(m1(airportTag, /xlink:title="([^"]+)"/i));

    const icao =
      airportUuidToIcao.get(airportUuid) ||
      (/^[A-Z]{4}$/.test(airportTitle) ? airportTitle : "");

    if (runwayUuid && icao) {
      runwayUuidToIcao.set(runwayUuid, icao);
    }
  }

  // --------------------------------------------------
  // 2b) RunwayDirection UUID -> { icao, rwy }
  // --------------------------------------------------
  const runwayDirectionUuidToMeta = new Map();

  for (const m of all(
    xml,
    /<aixm:RunwayDirection\b[\s\S]*?<\/aixm:RunwayDirection>/g
  )) {
    const block = m[0];

    const dirUuid = normUuid(
      m1(block, /<gml:identifier\b[^>]*>([^<]+)<\/gml:identifier>/i) ||
      m1(block, /gml:id="([^"]+)"/i)
    );

    const rwy = normRwy(
      m1(block, /<aixm:designator\b[^>]*>([^<]+)<\/aixm:designator>/i)
    );

    const usedRunwayTag =
      m1(block, /<(?:aixm:)?usedRunway\b([^>]*)\/?>/i) || "";

    const runwayUuid = hrefUuid(usedRunwayTag);
    const icao = runwayUuidToIcao.get(runwayUuid) || "";

    if (dirUuid && icao && rwy) {
      runwayDirectionUuidToMeta.set(dirUuid, { icao, rwy });
    }
  }

  debug(args.verbose, `Runway UUIDs mapped: ${runwayUuidToIcao.size}`);
  debug(args.verbose, `RunwayDirection UUIDs mapped: ${runwayDirectionUuidToMeta.size}`);
  if (args.verbose && runwayDirectionUuidToMeta.size === 0) {
    const sampleDir = all(
      xml,
      /<aixm:RunwayDirection\b[\s\S]*?<\/aixm:RunwayDirection>/g
    )[0];

    console.log("[update-runways:debug] first RunwayDirection block:");
    console.log((sampleDir || "").slice(0, 4000));
  }

  if (args.verbose && runwayDirectionUuidToMeta.size) {
    console.log(
      "[update-runways:debug] sample runway-direction meta:",
      [...runwayDirectionUuidToMeta.entries()].slice(0, 5)
    );
  }

  // --------------------------------------------------
  // 3) Declared distances from RunwayCentrelinePoint
  // --------------------------------------------------
  const result = {};
  const centrelineMatches = all(
    xml,
    /<aixm:RunwayCentrelinePoint\b[\s\S]*?<\/aixm:RunwayCentrelinePoint>/g
  );

  debug(args.verbose, `RunwayCentrelinePoint matches: ${centrelineMatches.length}`);

  let linkedCount = 0;
  let toraCount = 0;
  let ldaCount = 0;

  for (const m of centrelineMatches) {
    const block = m[0];

    const onRunwayTag =
      m1(block, /<(?:aixm:)?onRunway\b([^>]*)\/?>/i) || "";

    const dirUuid = hrefUuid(onRunwayTag);
    const meta = runwayDirectionUuidToMeta.get(dirUuid);

    if (!meta) continue;

    const { icao, rwy } = meta;
    if (!approvedIcaos.has(icao)) continue;

    linkedCount++;

    if (!result[icao]) {
      result[icao] = {
        name: airfields[icao]?.name || "",
        source: "DFS AIP",
        runways: {},
      };
    }

    if (!result[icao].runways[rwy]) {
      result[icao].runways[rwy] = {};
    }

    const ddMatches = all(
      block,
      /<aixm:RunwayDeclaredDistance\b[\s\S]*?<aixm:type>([^<]+)<\/aixm:type>[\s\S]*?<aixm:distance\b[^>]*>([^<]+)<\/aixm:distance>[\s\S]*?<\/aixm:RunwayDeclaredDistance>/g
    );

    if (args.verbose && ddMatches.length === 0) {
      console.log("[update-runways:debug] no DD match for", { icao, rwy, dirUuid });
      console.log(block.slice(0, 2500));
    }

    for (const dd of ddMatches) {
      const type = String(dd[1]).trim().toUpperCase();
      const dist = num(dd[2]);
      if (!Number.isFinite(dist)) continue;

      if (type === "TORA") {
        result[icao].runways[rwy].tora = dist;
        toraCount++;
      }
      if (type === "LDA") {
        result[icao].runways[rwy].lda = dist;
        ldaCount++;
      }
    }
  }

  debug(args.verbose, `Linked centreline points: ${linkedCount}`);
  debug(args.verbose, `TORA assigned: ${toraCount}`);
  debug(args.verbose, `LDA assigned: ${ldaCount}`);

  // --------------------------------------------------
  // cleanup: nur Airports mit mindestens einer RWY behalten
  // --------------------------------------------------
  for (const icao of Object.keys(result)) {
    const rwys = result[icao].runways || {};
    if (!Object.keys(rwys).length) {
      delete result[icao];
      continue;
    }

    for (const rwy of Object.keys(rwys)) {
      const entry = rwys[rwy];
      if (entry.tora == null && entry.lda == null) {
        delete rwys[rwy];
      }
    }

    if (!Object.keys(rwys).length) {
      delete result[icao];
    }
  }
  await fs.writeFile(args.out, JSON.stringify(result, null, 2));
  console.log(`[update-runways] Wrote ${args.out}`);

  const airportCount = Object.keys(result).length;
  const runwayCount = Object.values(result).reduce(
    (sum, airport) => sum + Object.keys(airport.runways || {}).length,
    0
  );

  console.log(`[update-runways] Airports: ${airportCount}, Runways: ${runwayCount}`);
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
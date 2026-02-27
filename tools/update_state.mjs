#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const STATE_PATH = "state.md";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
}
function safeSh(cmd) {
  try { return sh(cmd); } catch { return ""; }
}

function nowIso() {
  return new Date().toISOString();
}

function getBranch() {
  return safeSh("git rev-parse --abbrev-ref HEAD") || "unknown";
}

function getLastCommits(n = 5) {
  const out = safeSh(`git log -n ${n} --pretty=format:"- %h %s (%an)"`);
  return out || "- (no commits found)";
}

function getChangedFiles() {
  const out = safeSh("git status --porcelain");
  if (!out) return "- (clean)";
  return out
    .split("\n")
    .filter(Boolean)
    .map(l => `- ${l}`)
    .join("\n");
}

function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
}

function detectFeatures() {
  const features = [];

  if (existsSync("js/orm.js")) features.push("ORM Workflow");
  if (existsSync("js/signature_stamp.js")) features.push("Signature Stamping");
  if (existsSync("js/phone_popup.js")) features.push("Phone Popup (Config-locked)");
  if (existsSync("js/checklist.js")) features.push("Checklist State");
  if (existsSync("js/fuel.js")) features.push("Fuel Planning");
  if (existsSync("js/performance.js")) features.push("Performance Planning");
  if (existsSync("js/map.js")) features.push("Map View");

  return features.length
    ? features.map(f => `  - ${f}`).join("\n")
    : "  - (none detected)";
}

function buildAutoBlock() {
  return [
    "<!-- STATE:AUTO:BEGIN -->",
    `- Last updated: ${nowIso()}`,
    `- Branch: ${getBranch()}`,
    `- App Version: ${getAppVersion()}`,
    `- Active Features:`,
    `${detectFeatures()}`,
    `- Last commits:`,
    `${getLastCommits(5)}`,
    `- Changed files (working tree):`,
    `${getChangedFiles()}`,
    "<!-- STATE:AUTO:END -->",
  ].join("\n");
}

function replaceAutoBlock(md, block) {
  const begin = "<!-- STATE:AUTO:BEGIN -->";
  const end = "<!-- STATE:AUTO:END -->";

  const bi = md.indexOf(begin);
  const ei = md.indexOf(end);

  if (bi === -1 || ei === -1 || ei < bi) {
    return block + "\n\n" + md;
  }

  return md.slice(0, bi) + block + md.slice(ei + end.length);
}

function main() {
  if (!existsSync(STATE_PATH)) {
    console.error("state.md not found.");
    process.exit(1);
  }

  const md = readFileSync(STATE_PATH, "utf8");
  const block = buildAutoBlock();
  const next = replaceAutoBlock(md, block);

  if (next !== md) writeFileSync(STATE_PATH, next, "utf8");
}

main();
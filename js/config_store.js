// js/config_store.js
// Lädt data/config.enc und entschlüsselt es im Browser (WebCrypto: PBKDF2 + AES-GCM)
// Dateiformat muss zum Node-Script passen: "FP1" + salt(16) + iv(12) + tag(16) + ciphertext

const ENC_URL = "data/config.enc";
const LS_PASS = "fp.config.pass";

const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

let _cache = null;

export function getConfigPassword() {
  return localStorage.getItem(LS_PASS) || "";
}

export function setConfigPassword(pass) {
  if (pass) localStorage.setItem(LS_PASS, pass);
  else localStorage.removeItem(LS_PASS);
}

export function clearConfigCache() {
  _cache = null;
}

async function pbkdf2Key(pass, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

function readEncFile(buf) {
  const u8 = new Uint8Array(buf);
  const magic = new TextDecoder().decode(u8.slice(0, 3));
  if (magic !== "FP1") throw new Error("Ungültiges Config-Format (FP1 fehlt).");

  const saltStart = 3;
  const saltEnd = saltStart + SALT_LEN;

  const ivStart = saltEnd;
  const ivEnd = ivStart + IV_LEN;

  const tagStart = ivEnd;
  const tagEnd = tagStart + TAG_LEN;

  const salt = u8.slice(saltStart, saltEnd);
  const iv = u8.slice(ivStart, ivEnd);
  const tag = u8.slice(tagStart, tagEnd);
  const ciphertext = u8.slice(tagEnd);

  return { salt, iv, tag, ciphertext };
}

export async function loadConfig({ force = false } = {}) {
  if (_cache && !force) return _cache;

  const pass = getConfigPassword();
  if (!pass) throw new Error("CONFIG_PASS_MISSING");

  const res = await fetch(ENC_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Config laden fehlgeschlagen (${res.status}).`);

  const buf = await res.arrayBuffer();
  const { salt, iv, tag, ciphertext } = readEncFile(buf);

  const key = await pbkdf2Key(pass, salt);

  // WebCrypto erwartet ciphertext+tag am Ende
  const ctAndTag = new Uint8Array(ciphertext.length + tag.length);
  ctAndTag.set(ciphertext, 0);
  ctAndTag.set(tag, ciphertext.length);

  let plain;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ctAndTag
    );
  } catch {
    throw new Error("CONFIG_PASS_WRONG");
  }

  const jsonText = new TextDecoder().decode(new Uint8Array(plain));
  const data = JSON.parse(jsonText);

  _cache = data;
  window.dispatchEvent(new CustomEvent("fp:config-loaded", { detail: { config: data } }));
  return data;
}
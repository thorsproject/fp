// tools/config-crypto.mjs
import { readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";

const ALG = "aes-256-gcm";
const PBKDF2_ITERS = 200_000;
const SALT_LEN = 16;
const IV_LEN = 12;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERS, 32, "sha256");
}

function pack({ salt, iv, tag, ciphertext }) {
  // Format: "FP1" + salt + iv + tag + ciphertext
  const magic = Buffer.from("FP1");
  return Buffer.concat([magic, salt, iv, tag, ciphertext]);
}

function unpack(buf) {
  const magic = buf.subarray(0, 3).toString("utf8");
  if (magic !== "FP1") throw new Error("Invalid file format (missing FP1).");
  const salt = buf.subarray(3, 3 + SALT_LEN);
  const iv = buf.subarray(3 + SALT_LEN, 3 + SALT_LEN + IV_LEN);
  const tag = buf.subarray(3 + SALT_LEN + IV_LEN, 3 + SALT_LEN + IV_LEN + 16);
  const ciphertext = buf.subarray(3 + SALT_LEN + IV_LEN + 16);
  return { salt, iv, tag, ciphertext };
}

async function encrypt({ inPath, outPath, password }) {
  const plaintext = await readFile(inPath);
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALG, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  await writeFile(outPath, pack({ salt, iv, tag, ciphertext }));
  console.log(`OK: encrypted -> ${outPath}`);
}

async function decrypt({ inPath, outPath, password }) {
  const buf = await readFile(inPath);
  const { salt, iv, tag, ciphertext } = unpack(buf);
  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  await writeFile(outPath, plaintext);
  console.log(`OK: decrypted -> ${outPath}`);
}

const [,, cmd, inPath, outPath] = process.argv;
const password = process.env.FP_CONFIG_PASS;

if (!cmd || !inPath || !outPath) {
  console.log("Usage:");
  console.log("  FP_CONFIG_PASS=... node tools/config-crypto.mjs enc data/config.json data/config.enc");
  console.log("  FP_CONFIG_PASS=... node tools/config-crypto.mjs dec data/config.enc data/config.json");
  process.exit(1);
}
if (!password) {
  console.error("Missing FP_CONFIG_PASS env var.");
  process.exit(1);
}

if (cmd === "enc") await encrypt({ inPath, outPath, password });
else if (cmd === "dec") await decrypt({ inPath, outPath, password });
else throw new Error("Unknown command: " + cmd);
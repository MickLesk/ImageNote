// Sanity checks on the committed bundle so a broken build never reaches HACS.
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const hacs = JSON.parse(await readFile(new URL("../hacs.json", import.meta.url), "utf8"));
const bundle = await readFile(new URL(`../dist/${hacs.filename}`, import.meta.url), "utf8");

const checks = [
  [`version banner v${pkg.version}`, bundle.includes(`Pinboard Card v${pkg.version}`)],
  ["defines pinboard-card", bundle.includes('"pinboard-card"')],
  ["defines pinboard-card-editor", bundle.includes('"pinboard-card-editor"')],
  ["registers in window.customCards", bundle.includes("customCards")],
  ["no leftover __VERSION__ placeholder", !bundle.includes("__VERSION__")],
  ["bundle below 150 kB", bundle.length < 150_000],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);

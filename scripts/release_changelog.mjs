// Moves the "Unreleased" section of CHANGELOG.md under a new version heading,
// or prints the notes of a version with --notes.
import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const notesOnly = args[0] === "--notes";
const version = notesOnly ? args[1] : args[0];
if (!version) {
  console.error("usage: release_changelog.mjs [--notes] <version>");
  process.exit(1);
}

const path = new URL("../CHANGELOG.md", import.meta.url);
const text = await readFile(path, "utf8");
const lines = text.split("\n");

function sectionOf(heading) {
  const start = lines.findIndex((line) => /^##\s+/.test(line) && line.includes(heading));
  if (start < 0) return null;
  let end = lines.findIndex((line, i) => i > start && /^##\s+/.test(line));
  if (end < 0) end = lines.length;
  return { start, end };
}

if (notesOnly) {
  const section = sectionOf(`[${version}]`) ?? sectionOf(version);
  if (section) {
    process.stdout.write(lines.slice(section.start + 1, section.end).join("\n").trim() + "\n");
  }
  process.exit(0);
}

const unreleased = sectionOf("[Unreleased]");
if (!unreleased) {
  console.error("CHANGELOG.md has no [Unreleased] section");
  process.exit(1);
}
const body = lines.slice(unreleased.start + 1, unreleased.end);
if (body.join("\n").trim() === "") {
  console.error("The [Unreleased] section is empty; add release notes first");
  process.exit(1);
}
const date = new Date().toISOString().slice(0, 10);
const updated = [
  ...lines.slice(0, unreleased.start),
  "## [Unreleased]",
  "",
  `## [${version}] - ${date}`,
  ...body,
  ...lines.slice(unreleased.end),
];
await writeFile(path, updated.join("\n"));
console.log(`CHANGELOG.md: moved Unreleased to ${version}`);

import { build, context } from "esbuild";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: ["src/imagenote-card.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: "dist/imagenote-card.js",
  define: { __VERSION__: JSON.stringify(pkg.version) },
  banner: {
    js: `/*! ImageNote Card v${pkg.version} | MIT | https://github.com/MickLesk/ImageNote */`,
  },
  legalComments: "none",
  sourcemap: false,
  minify: false,
  charset: "utf8",
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("Watching src/ for changes…");
} else {
  await build(options);
}

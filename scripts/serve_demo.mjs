// Tiny static server for the demo page: npm run demo → http://localhost:8765/demo/
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const port = Number(process.env.PORT ?? 8765);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };

createServer(async (req, res) => {
  let path = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => console.log(`Demo: http://localhost:${port}/demo/`));

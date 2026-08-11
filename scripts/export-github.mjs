import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const source = path.join(root, "dist", "client");
const output = path.join(root, "out-github");

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

const workerUrl = pathToFileURL(path.join(root, "dist", "server", "index.js"));
workerUrl.searchParams.set("export", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

const assets = { fetch: async () => new Response("Not found", { status: 404 }) };
const context = { waitUntil() {}, passThroughOnException() {} };

async function render(route, destination) {
  const response = await worker.fetch(new Request(`https://chollosaldia.com${route}`, { headers: { accept: "text/html" } }), { ASSETS: assets }, context);
  if (!response.ok) throw new Error(`No se pudo exportar ${route}: ${response.status}`);
  const target = path.join(output, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await response.text(), "utf8");
}

await render("/", "index.html");
await render("/aviso-legal", "aviso-legal/index.html");
await render("/privacidad", "privacidad/index.html");
await render("/afiliacion", "afiliacion/index.html");
await render("/robots.txt", "robots.txt");
await render("/sitemap.xml", "sitemap.xml");
await writeFile(path.join(output, "CNAME"), "chollosaldia.com\n", "utf8");
await writeFile(path.join(output, ".nojekyll"), "", "utf8");

console.log(`Web estática preparada en ${output}`);

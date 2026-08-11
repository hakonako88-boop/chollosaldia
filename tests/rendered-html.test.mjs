import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the ChollosAlDía storefront and SEO metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="es">/i);
  assert.match(html, /Chollos del día: ofertas, cupones y descuentos verificados/);
  assert.match(html, /Menos precio/);
  assert.match(html, /Chollos de hoy/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /rel="canonical" href="https:\/\/chollosaldia\.es"/);
  assert.match(html, /rel="nofollow sponsored noreferrer"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("keeps affiliate credentials out of the client source", async () => {
  const [client, example] = await Promise.all([readFile(new URL("../app/components/DealExplorer.tsx", import.meta.url), "utf8"), readFile(new URL("../.env.example", import.meta.url), "utf8")]);
  assert.doesNotMatch(client, /TELEGRAM_BOT_TOKEN|IMPORT_SECRET|AMAZON_ASSOCIATE_TAG/);
  assert.match(example, /AMAZON_ASSOCIATE_TAG=/);
  assert.match(example, /TELEGRAM_BOT_TOKEN=/);
});

import { getStore } from "@netlify/blobs";
import { handle } from "../dbcore.mjs";

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json", code: "invalid_argument" }, 400); }
  const store = getStore({ name: "oddsmaxxer", consistency: "strong" });
  try { return json(await handle(store, body)); }
  catch (e) { return json({ error: e.message || "error", code: e.code || "unavailable" }, e.status || 500); }
};

export const config = { path: "/api/db" };

// Tiny document store on Netlify Blobs. One blob per collection holding its docs,
// a per-collection version counter, and tombstones. Writes use etag checks and retry,
// so two phones moving at once never overwrite each other.
const RETRIES = 8;
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

function fail(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }
function splitDoc(path) {
  if (typeof path !== "string") throw fail(400, "invalid_argument", "path required");
  const s = path.split("/");
  if (s.length % 2 || s.length > 16 || !s.every(x => SEG.test(x))) throw fail(400, "invalid_argument", "bad document path");
  return { coll: s.slice(0, -1).join("/"), id: s[s.length - 1] };
}
function checkColl(coll) {
  const s = String(coll || "").split("/");
  if (s.length % 2 === 0 || !s.every(x => SEG.test(x))) throw fail(400, "invalid_argument", "bad collection path");
  return coll;
}
function merge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = isObj(b[k]) && isObj(a[k]) ? merge(a[k], b[k]) : b[k];
  return out;
}
const keyOf = coll => "c/" + coll;
const empty = () => ({ v: 0, docs: {}, del: {} });

async function read(store, coll) {
  const r = await store.getWithMetadata(keyOf(coll), { type: "json" });
  return r ? { data: r.data || empty(), etag: r.etag } : { data: empty(), etag: null };
}
async function mutate(store, coll, fn) {
  for (let i = 0; i < RETRIES; i++) {
    const { data, etag } = await read(store, coll);
    const result = fn(data);
    const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const r = await store.setJSON(keyOf(coll), data, opts);
    if (!r || r.modified !== false) return result;
    await new Promise(res => setTimeout(res, 20 + Math.random() * 60 * (i + 1)));
  }
  throw fail(409, "unavailable", "busy, try again");
}

export async function handle(store, body) {
  const op = body && body.op;
  if (op === "poll") {
    const coll = checkColl(body.coll);
    const since = Number(body.since) || 0;
    const { data } = await read(store, coll);
    const docs = [];
    for (const [id, d] of Object.entries(data.docs)) if (d.v > since) docs.push({ id, data: d.data });
    return { seq: data.v, docs, ids: Object.keys(data.docs) };
  }
  if (op === "pollMany") {
    const list = Array.isArray(body.colls) ? body.colls.slice(0, 12) : [];
    const results = {};
    await Promise.all(list.map(async ({ coll, since }) => {
      checkColl(coll);
      const { data } = await read(store, coll);
      since = Number(since) || 0;
      if (data.v === since) { results[coll] = { seq: data.v, same: true }; return; }
      const docs = [];
      for (const [id, d] of Object.entries(data.docs)) if (d.v > since) docs.push({ id, data: d.data });
      results[coll] = { seq: data.v, docs, ids: Object.keys(data.docs) };
    }));
    return { results };
  }
  if (op === "get") {
    const { coll, id } = splitDoc(body.path);
    const { data } = await read(store, coll);
    return { doc: data.docs[id] ? data.docs[id].data : null };
  }
  if (op === "set" || op === "update") {
    const { coll, id } = splitDoc(body.path);
    if (!isObj(body.data)) throw fail(400, "invalid_argument", "data must be an object");
    if (JSON.stringify(body.data).length > 256 * 1024) throw fail(400, "invalid_argument", "document too large");
    return mutate(store, coll, data => {
      if (op === "update" && !data.docs[id]) throw fail(400, "invalid_argument", "document does not exist");
      data.v += 1;
      const next = op === "set" ? body.data : merge(data.docs[id].data, body.data);
      data.docs[id] = { v: data.v, data: next };
      delete data.del[id];
      return { ok: true, v: data.v };
    });
  }
  if (op === "delete") {
    const { coll, id } = splitDoc(body.path);
    return mutate(store, coll, data => {
      if (data.docs[id]) { data.v += 1; delete data.docs[id]; data.del[id] = data.v; }
      return { ok: true };
    });
  }
  throw fail(400, "invalid_argument", "unknown op");
}

// Fretwork offline helper: keeps a copy of the app so it opens without internet,
// and receives tabs shared to the app from other apps.
const CACHE = "fretwork-v45";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== "fretwork-share").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);

  // A PDF, text file or text shared to Fretwork from another app.
  if (req.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/share-target")) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const c = await caches.open("fretwork-share");
        const f = fd.get("file");
        if (f && typeof f !== "string" && f.size) {
          await c.put("./shared-file", new Response(f, { headers: {
            "content-type": f.type || "application/octet-stream",
            "x-name": encodeURIComponent(f.name || "shared file") } }));
        }
        const text = [fd.get("text"), fd.get("url")].filter(Boolean).join("\n");
        await c.put("./shared-text", new Response(JSON.stringify({ title: fd.get("title") || "", text })));
      } catch (err) {}
      return Response.redirect(new URL("./?shared=1", self.registration.scope).href, 303);
    })());
    return;
  }

  if (req.method !== "GET") return;
  const sameOrigin = url.origin === self.location.origin;
  const keep = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdnjs.cloudflare.com";
  if (!sameOrigin && !keep) return;

  // Pages: network first so updates arrive, saved copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("./index.html", copy));
      return res;
    }).catch(() => caches.match("./index.html")));
    return;
  }

  // Icons, fonts, PDF reader: saved copy first, refreshed in the background.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

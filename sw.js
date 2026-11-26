// 화면 파일을 폰에 저장해 두고 바로 열어요(열 때마다 뒤에서 최신으로 바꿔요). 데이터(회원 정보·과제)는 저장하지 않아요.
// 화면 파일을 크게 바꿨다면 VERSION 숫자를 올려 주세요.
const VERSION = 'v1';
const CACHE = 'bog-member-' + VERSION;
const FILES = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bog-member-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // 서버 요청·글꼴은 그대로 통과
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res && res.ok) c.put(hit && r.mode === 'navigate' ? './' : r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }                               // 저장된 화면을 먼저 보여 줘요
    return (await net) || (await c.match('./', { ignoreSearch: true })) || Response.error();
  }));
});

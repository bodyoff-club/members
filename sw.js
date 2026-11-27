// 화면 파일을 폰에 저장해 두고 바로 열어요(열 때마다 뒤에서 최신으로 바꿔요). 데이터(회원 정보·과제)는 저장하지 않아요.
// 화면 파일을 크게 바꿨다면 VERSION 숫자를 올려 주세요.
importScripts('config.js');   // 서버 주소(self.BOG_API)
const VERSION = 'v2';
const CACHE = 'bog-member-' + VERSION;
const FILES = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
// ── 앱 푸시: 푸시 신호를 받으면 서버에서 오늘의 알림 문구를 받아와 알림을 띄워요 (문구는 Code.gs 맨 위 PUSH 설정)
const FALLBACK = { title: '바디오프짐', body: '오늘의 과제를 확인해 주세요.' };   // 서버에서 문구를 받지 못했을 때만 써요
async function showToday() {
  let m = null;
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (sub && self.BOG_API) {
      const ac = new AbortController(), t = setTimeout(() => ac.abort(), 15000);
      try { const res = await fetch(self.BOG_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ op: 'pmsg', ep: sub.endpoint }), redirect: 'follow', signal: ac.signal }); m = await res.json(); } finally { clearTimeout(t); }
    }
  } catch (err) { m = null; }
  const title = (m && m.title) || FALLBACK.title, body = (m && m.body) || FALLBACK.body;
  return self.registration.showNotification(title, { body, icon: 'icons/icon-192.png', tag: 'bog-today', renotify: true });
}
self.addEventListener('push', e => { e.waitUntil(showToday()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) { try { await c.focus(); } catch (x) { /* 무시 */ } return; } }
    return self.clients.openWindow(self.registration.scope);   // 알림을 누르면 회원 앱이 열려요
  })());
});
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

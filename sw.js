const CACHE = 'trackinfin-v12';
const NEVER_CACHE = [
  'googleapis.com','firebaseio.com','firebaseapp.com',
  'identitytoolkit','securetoken','groq','generativelanguage',
  'cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('/').catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (NEVER_CACHE.some(x => url.includes(x))) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return r;})
      .catch(()=>caches.match('/').then(r=>r||new Response('Offline.',{status:503,headers:{'Content-Type':'text/plain'}})))
    );
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{if(r&&r.status===200&&r.type!=='opaque'){const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));}return r;}).catch(()=>caches.match(e.request)));
});

// ── PUSH ──────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let d={title:'Trackinfin',body:'You have a reminder',icon:'/icon-192.png',badge:'/icon-192.png',tag:'tfi'};
  try{if(e.data)Object.assign(d,e.data.json());}catch{}
  e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:d.icon||'/icon-192.png',badge:d.badge||'/icon-192.png',tag:d.tag||'tfi',data:d.url||'/',vibrate:[200,100,200],requireInteraction:!!d.requireInteraction,actions:d.actions||[]}));
});

// ── SCHEDULED LOCAL NOTIFICATIONS (app sends via postMessage) ────
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SCHEDULE_NOTIFICATION') return;
  const {title,body,tag,delay,url,requireInteraction} = e.data;
  setTimeout(() => {
    self.registration.showNotification(title, {
      body, icon:'/icon-192.png', badge:'/icon-192.png',
      tag:tag||'tfi-reminder', data:url||'/',
      vibrate:[200,100,200], requireInteraction:!!requireInteraction
    });
  }, Math.max(0, delay||0));
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data || '/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){if(c.url.includes(self.location.origin)){c.focus();c.postMessage({type:'NOTIFICATION_CLICK',url});return;}}
      clients.openWindow(url);
    })
  );
});

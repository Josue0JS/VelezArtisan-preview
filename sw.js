/* Cache únicamente de recursos propios. No interceptar Firebase ni peticiones remotas. */
const CACHE = 'velezartisan-static-v1';
const STATIC = ['./','./index.html','./manifest.webmanifest',
 './css/base.css','./css/glass.css','./css/components.css','./css/animations.css','./css/theme.css','./css/login.css','./css/mobile.css','./css/horarios.css',
 './js/config.js','./js/utils.js','./js/effects.js','./js/state.js','./js/data.js','./js/auth.js','./js/predict.js','./js/charts.js','./js/views.js','./js/ventas.js','./js/inventario.js','./js/mermas.js','./js/productos.js','./js/proveedores.js','./js/recepciones.js','./js/pedidos.js','./js/main.js','./js/mobile.js','./js/horarios.js',
 './assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('velezartisan-static-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const req=event.request;
 if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
 const url=new URL(req.url);
 if(!STATIC.some(path => new URL(path,self.registration.scope).pathname === url.pathname)) return;
 event.respondWith(fetch(req).then(response => {
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
   return response;
 }).catch(() => caches.match(req)));
});

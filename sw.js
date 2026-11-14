const prefix='oppidum-'+self.registration.scope+'-';
const cacheName=prefix+'direkt-v2';
const assets=['./','./index.html','./style.css','./engine.js','./app.js','./match.mjs','./clock.mjs',
 './scene.js','./castle-geometry.js','./vendor/three.module.js','./vendor/three.core.js','./vendor/OrbitControls.js',
 './manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(assets))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(prefix)&&key!==cacheName).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||!url.href.startsWith(self.registration.scope))return;
 const paths=new Set(assets.map(asset=>new URL(asset,self.registration.scope).pathname));
 if(event.request.mode!=='navigate'&&!paths.has(url.pathname))return;
 event.respondWith(fetch(event.request).catch(async()=>{
  const cache=await caches.open(cacheName);
  return (await cache.match(event.request,{ignoreSearch:true}))||
   (event.request.mode==='navigate'?await cache.match('./index.html'):Response.error());
 }));
});

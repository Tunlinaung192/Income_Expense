const CACHE_NAME = 'wallet-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

// ဖိုင်တွေကို ဖုန်းထဲမှာ Cache အဖြစ် ကြိုသိမ်းထားခြင်း
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// အင်တာနက်မရှိရင် ဖုန်းထဲက Cache ဖိုင်တွေကို ထုတ်ပေးခြင်း
self.addEventListener('fetch', e => {
  // Google Sheet URL ဆိုရင် cache မလုပ်ဘဲ ကျော်သွားမယ်
  if (e.request.url.includes('script.google.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});

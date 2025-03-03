// キャッシュの名前
const CACHE_NAME = 'aves-audio-spectrum-v1';

// キャッシュするファイルのリスト
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/index.js',
  '/assets/index.css',
];

// サービスワーカーのインストール時
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
  );
});

// ネットワークリクエスト時のキャッシュ利用
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュがあればそれを返す
        if (response) {
          return response;
        }
        // キャッシュがなければネットワークからフェッチ
        return fetch(event.request);
      })
  );
});

// キャッシュの更新
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

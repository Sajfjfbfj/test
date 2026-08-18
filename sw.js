// Minimum Service Worker for PWA installation
const CACHE_NAME = 'kyudo-3d-v1';

self.addEventListener('install', (event) => {
  // インストール時にキャッシュを行わない最小構成
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // ネットワークから直接取得（PWAのインストール条件を満たすために記述が必要）
  event.respondWith(fetch(event.request));
});
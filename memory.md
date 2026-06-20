## [2026-06-20T23:08:00+01:00]
**Status:** Implemented a new Service Worker (`sw.js`) and registration pipeline. The service worker caches static and external assets, calls `self.skipWaiting()` and `self.clients.claim()` to active-replace old service workers immediately, and triggers a single client page refresh on `controllerchange` to push updates instantly to installed versions.
**Files Changed:**
- [sw.js](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/sw.js)
- [index.html](file:///c:/Users/david/OneDrive/Coding/Projects/Lumina/index.html)
**Next Objectives:**
- Await client PWA installation checks and auto-update verification.

---
'@fingerprint/cloudflare-worker-proxy': patch
---

Agent script responses now pass the Fingerprint CDN's `Cache-Control` through unchanged. The worker no longer caps `max-age` at one hour, and no longer adds `s-maxage=60`.

#!/usr/bin/env bash

set -e

if [ ! -d ./dist ]; then
  echo "dist directory does not exist, run pnpm build first"
  exit 1
fi

set -x

cp ./dist/fingerprint_proxy_local_development/index.js ./dist/fingerprintjs-pro-cloudflare-worker.esm.js
cp ./dist/fingerprint_proxy_local_development/index.js ./dist/fingerprint-cloudflare-worker-proxy.js

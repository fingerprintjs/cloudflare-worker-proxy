import { defineConfig, type Plugin } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import checker from 'vite-plugin-checker'
import { getLicenseBanner } from './build-utils/license'
import pkg from './package.json'

function licenseBannerPlugin(): Plugin {
  const banner = getLicenseBanner('Cloudflare Worker Proxy Integration')
  return {
    name: 'license-banner',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk') {
          chunk.code = `${banner}\n${chunk.code}`
        }
      }
    },
  }
}

export default defineConfig({
  define: {
    __current_worker_version__: JSON.stringify(pkg.version),
  },
  server: {
    cors: false,
  },
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.worker.json',
      },
    }),
    cloudflare(),
    licenseBannerPlugin(),
  ],
})

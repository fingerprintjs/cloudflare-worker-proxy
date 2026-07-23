import { defineConfig, includeIgnoreFile } from 'eslint/config'
import dxTeamConfig from '@fingerprintjs/eslint-config-dx-team'
import { fileURLToPath } from 'node:url'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))

export default defineConfig([
  includeIgnoreFile(gitignorePath, { gitignoreResolution: true }),
  {
    ignores: ['worker-configuration.d.ts'],
  },
  {
    extends: [dxTeamConfig],
  },
])

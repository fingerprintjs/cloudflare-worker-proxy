import { describe, it, expect } from 'vitest'
import { Defaults, WorkerEnv, getIngressBaseHost, getIntegrationPathDepth } from '../../src/env'

describe('getIngressBaseHost', () => {
  it('uses default when empty string configured', () => {
    expect(getIngressBaseHost({ ...Defaults, FPJS_INGRESS_BASE_HOST: '' })).toBe(Defaults.FPJS_INGRESS_BASE_HOST)
  })
})

describe('getIntegrationPathDepth', () => {
  function makeEnv(depth: WorkerEnv['INTEGRATION_PATH_DEPTH']): WorkerEnv {
    return { ...Defaults, INTEGRATION_PATH_DEPTH: depth }
  }

  it('returns the configured value when set to a positive integer', () => {
    expect(getIntegrationPathDepth(makeEnv(3))).toBe(3)
  })

  it.each([null, 0, -1, NaN, +Infinity, -Infinity, -0, 0.1])(
    'returns the default for an invalid INTEGRATION_PATH_DEPTH - %s',
    (input) => {
      expect(getIntegrationPathDepth(makeEnv(input))).toBe(Defaults.INTEGRATION_PATH_DEPTH)
    }
  )
})

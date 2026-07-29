import { describe, it, expect, vi } from 'vitest'
import { Defaults, WorkerEnv, getIngressBaseHost, getIntegrationPathDepth } from '../../src/env'

describe('getIngressBaseHost', () => {
  it('uses default when empty string configured', () => {
    expect(getIngressBaseHost({ ...Defaults, FPJS_INGRESS_BASE_HOST: '' })).toBe(Defaults.FPJS_INGRESS_BASE_HOST)
  })

  it('throws when no value is set and no default is available', async () => {
    vi.resetModules()
    vi.doMock('../../src/config', () => ({ config: { ingressApi: null } }))
    const { getIngressBaseHost: getIngressBaseHostNoDefault, Defaults: DefaultsNoDefault } = await import(
      '../../src/env'
    )

    expect(() => getIngressBaseHostNoDefault({ ...DefaultsNoDefault, FPJS_INGRESS_BASE_HOST: null })).toThrow(
      'FPJS_INGRESS_BASE_HOST is not set and no default is available'
    )

    vi.doUnmock('../../src/config')
    vi.resetModules()
  })
})

describe('getIntegrationPathDepth', () => {
  function makeEnv(depth: WorkerEnv['INTEGRATION_PATH_DEPTH']): WorkerEnv {
    return { ...Defaults, INTEGRATION_PATH_DEPTH: depth }
  }

  it('returns the configured value when set to a positive integer', () => {
    expect(getIntegrationPathDepth(makeEnv(3))).toBe(3)
  })

  it('parses a positive integer provided as a string', () => {
    expect(getIntegrationPathDepth(makeEnv('3'))).toBe(3)
  })

  it.each([
    [0, 0],
    ['0', 0],
  ])('returns %s as %i', (input, expected) => {
    expect(getIntegrationPathDepth(makeEnv(input))).toBe(expected)
  })

  it('returns the default when INTEGRATION_PATH_DEPTH is undefined at runtime', () => {
    // Extra test even though types should already guard against 'undefined', hence the assertion
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const env = { ...Defaults, INTEGRATION_PATH_DEPTH: undefined } as unknown as WorkerEnv
    expect(getIntegrationPathDepth(env)).toBe(Defaults.INTEGRATION_PATH_DEPTH)
  })

  it.each([null, -1, NaN, Infinity, -Infinity, -0, 0.1, '', 'abc', '1.5'])(
    'returns the default for an invalid INTEGRATION_PATH_DEPTH - %s',
    (input) => {
      expect(getIntegrationPathDepth(makeEnv(input))).toBe(Defaults.INTEGRATION_PATH_DEPTH)
    }
  )
})

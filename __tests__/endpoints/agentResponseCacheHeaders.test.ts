import { describe, test, expect, beforeAll, afterAll, vi, type MockInstance } from 'vitest'
import worker from '../../src/index'
import { WorkerEnv } from '../../src/env'
import { config } from '../../src/config'

const baseEnv = {
  FPJS_INGRESS_BASE_HOST: config.ingressApi,
  PROXY_SECRET: 'proxy_secret',
  INTEGRATION_PATH_DEPTH: '1',
}

/**
 * The agent script reaches the worker two ways: v3 clients request the configured agent
 * download path, while v4 clients request `/web/v4/<apiKey>`, which matches no route prefix
 * and falls through to the default one. Both have to relay the CDN's caching headers alike.
 */
const agentRequests: { name: string; url: string; env: WorkerEnv }[] = [
  {
    name: 'v3 agent download path',
    url: 'https://example.com/worker_path/agent_download?apiKey=someApiKey',
    env: { ...baseEnv, GET_RESULT_PATH: 'get_result', AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download' },
  },
  {
    name: 'v4 default route',
    url: 'https://example.com/worker_path/web/v4/someApiKey',
    env: { ...baseEnv, GET_RESULT_PATH: null, AGENT_SCRIPT_DOWNLOAD_PATH: null },
  },
]

describe.each(agentRequests)('agent response cache headers - $name', ({ url, env }) => {
  let fetchSpy: MockInstance<typeof fetch>

  function mockOriginResponse(headers: Record<string, string>, status = 200) {
    fetchSpy.mockImplementation(async () => new Response(status === 304 ? null : '', { status, headers }))
  }

  function fetchAgent() {
    return worker.fetch(new Request(url), env)
  }

  beforeAll(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterAll(() => {
    fetchSpy.mockRestore()
  })

  test.each([
    'public, max-age=3613',
    'public, max-age=3613, s-maxage=575500',
    'public, max-age=100, s-maxage=10',
    'public, max-age=604800',
  ])('cache-control is passed through unchanged - %s', async (cacheControl) => {
    mockOriginResponse({ 'content-type': 'text/javascript', 'cache-control': cacheControl })
    const response = await fetchAgent()
    expect(response.headers.get('cache-control')).toBe(cacheControl)
  })

  test('age is passed through unchanged when the CDN sends one', async () => {
    mockOriginResponse({ 'content-type': 'text/javascript', 'cache-control': 'public, max-age=3613', age: '1234' })
    const response = await fetchAgent()
    expect(response.headers.get('age')).toBe('1234')
  })

  test('no age is added when the CDN sends none', async () => {
    mockOriginResponse({ 'content-type': 'text/javascript', 'cache-control': 'public, max-age=3613' })
    const response = await fetchAgent()
    expect(response.headers.has('age')).toBe(false)
  })

  test('a 304 is relayed with its age, etag and cache-control intact', async () => {
    mockOriginResponse({ 'cache-control': 'public, max-age=3613', etag: '"abc"', age: '42' }, 304)
    const response = await fetchAgent()
    expect(response.status).toBe(304)
    expect(response.headers.get('age')).toBe('42')
    expect(response.headers.get('etag')).toBe('"abc"')
    expect(response.headers.get('cache-control')).toBe('public, max-age=3613')
  })

  test('etag is passed through unchanged', async () => {
    mockOriginResponse({ 'content-type': 'text/javascript', etag: 'W/"xyz"' })
    const response = await fetchAgent()
    expect(response.headers.get('etag')).toBe('W/"xyz"')
  })
})

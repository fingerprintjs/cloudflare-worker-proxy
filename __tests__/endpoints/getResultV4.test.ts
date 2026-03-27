import { describe, test, assert, expect, beforeAll, beforeEach, afterAll, vi, type MockInstance } from 'vitest'
import { WorkerEnv } from '../../src/env'
import worker from '../../src'
import { FPJSResponse } from '../../src/utils'
import { config } from '../../src/config'

const workerEnv: WorkerEnv = {
  FPJS_INGRESS_BASE_HOST: config.ingressApi,
  PROXY_SECRET: 'proxy_secret',
  GET_RESULT_PATH: null,
  AGENT_SCRIPT_DOWNLOAD_PATH: null,
  INTEGRATION_PATH_DEPTH: 1,
}

describe.each([
  ['no trailing slash', 'https://example.com/worker_path'],
  ['trailing slash', 'https://example.com/worker_path/'],
])('v4 ingress API - %s', (_name, ingressUrl) => {
  describe('ingress API url from worker env', () => {
    let fetchSpy: MockInstance<typeof fetch>
    let reqURL: URL
    let receivedReqURL = ''

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockImplementation(async (input, init) => {
        const req = new Request(input, init)
        receivedReqURL = req.url
        return new Response()
      })
    })

    beforeEach(() => {
      reqURL = new URL(ingressUrl)

      receivedReqURL = ''
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('custom ingress url', async () => {
      const env = {
        ...workerEnv,
        FPJS_INGRESS_BASE_HOST: 'ingress.test.com',
      } satisfies WorkerEnv

      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, env)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://ingress.test.com`)
    })

    test('null ingress url', async () => {
      const env = {
        ...workerEnv,
        FPJS_INGRESS_BASE_HOST: null,
      } satisfies WorkerEnv

      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, env)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    })
  })

  describe('ingress API request proxy URL', () => {
    let fetchSpy: MockInstance<typeof fetch>
    let reqURL: URL
    let receivedReqURL = ''

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockImplementation(async (input, init) => {
        const req = new Request(input, init)
        receivedReqURL = req.url
        return new Response()
      })
    })

    beforeEach(() => {
      reqURL = new URL(ingressUrl)

      receivedReqURL = ''
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('no region', async () => {
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    })

    test('us region', async () => {
      reqURL.searchParams.append('region', 'us')
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    })

    test('eu region', async () => {
      reqURL.searchParams.append('region', 'eu')
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://eu.${config.ingressApi}`.toLowerCase())
    })

    test('ap region', async () => {
      reqURL.searchParams.append('region', 'ap')
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://ap.${config.ingressApi}`.toLowerCase())
    })

    test('invalid region', async () => {
      reqURL.searchParams.append('region', 'foo.bar/baz')
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const receivedURL = new URL(receivedReqURL)
      expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    })
  })

  describe('ingress API request query parameters', () => {
    let fetchSpy: MockInstance<typeof fetch>
    let reqURL: URL
    let receivedReqURL = ''

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockImplementation(async (input, init) => {
        const req = new Request(input, init)
        receivedReqURL = req.url

        return new Response('')
      })
    })

    beforeEach(() => {
      reqURL = new URL(ingressUrl)
      reqURL.searchParams.append('someKey', 'someValue')

      receivedReqURL = ''
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('traffic monitoring when no ii parameter before', async () => {
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const url = new URL(receivedReqURL)
      const iiValues = url.searchParams.getAll('ii')
      expect(iiValues.length).toBe(1)
      expect(iiValues[0]).toBe(`fingerprintjs-pro-cloudflare/${__current_worker_version__}/ingress`)
    })
    test('traffic monitoring when there is ii parameter before', async () => {
      reqURL.searchParams.append('ii', 'fingerprintjs-pro-react/v1.2.3')
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const url = new URL(receivedReqURL)
      const iiValues = url.searchParams.getAll('ii')
      expect(iiValues.length).toBe(2)
      expect(iiValues[0]).toBe('fingerprintjs-pro-react/v1.2.3')
      expect(iiValues[1]).toBe(`fingerprintjs-pro-cloudflare/${__current_worker_version__}/ingress`)
    })
    test('whole query string when no ii parameter before', async () => {
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const url = new URL(receivedReqURL)
      expect(url.search).toBe(
        '?someKey=someValue' + `&ii=fingerprintjs-pro-cloudflare%2F${__current_worker_version__}%2Fingress`
      )
    })
    test('whole query string when there is ii parameter before', async () => {
      reqURL.searchParams.append('ii', 'fingerprintjs-pro-react/v1.2.3')
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      const url = new URL(receivedReqURL)
      expect(url.search).toBe(
        '?someKey=someValue' +
          '&ii=fingerprintjs-pro-react%2Fv1.2.3' +
          `&ii=fingerprintjs-pro-cloudflare%2F${__current_worker_version__}%2Fingress`
      )
    })
  })

  describe('ingress API request headers', () => {
    let fetchSpy: MockInstance<typeof fetch>
    const reqURL = new URL(ingressUrl)
    let receivedHeaders: Headers

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockImplementation(async (input, init) => {
        const req = new Request(input, init)
        receivedHeaders = req.headers

        return new Response('')
      })
    })

    beforeEach(() => {
      receivedHeaders = new Headers()
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('even if proxy secret is undefined, other FPJS-Proxy-* headers are still added to the proxied request headers. Original headers are preserved.', async () => {
      const workerEnv: WorkerEnv = {
        FPJS_INGRESS_BASE_HOST: config.ingressApi,
        PROXY_SECRET: null,
        GET_RESULT_PATH: 'get_result',
        AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download',
        INTEGRATION_PATH_DEPTH: 1,
      }
      const testIP = '203.0.1113.195'
      const reqHeaders = new Headers({
        accept: '*/*',
        'cache-control': 'no-cache',
        'accept-language': 'en-US',
        'user-agent': 'Mozilla/5.0',
        'x-some-header': 'some value',
        'cf-connecting-ip': testIP,
        'x-forwarded-for': `${testIP}, 2001:db8:85a3:8d3:1319:8a2e:370:7348`,
      })
      const req = new Request(reqURL.toString(), { headers: reqHeaders, method: 'POST' })
      await worker.fetch(req, workerEnv)
      const expectedHeaders = new Headers(reqHeaders)
      expectedHeaders.set('FPJS-Proxy-Client-IP', testIP)
      expectedHeaders.set('FPJS-Proxy-Forwarded-Host', 'example.com')
      receivedHeaders.forEach((value, key) => {
        expect(expectedHeaders.get(key)).toBe(value)
      })
      expectedHeaders.forEach((value, key) => {
        expect(receivedHeaders.get(key)).toBe(value)
      })
    })
    test('req headers are correct when proxy secret is set', async () => {
      const reqHeaders = new Headers({
        accept: '*/*',
        'cache-control': 'no-cache',
        'accept-language': 'en-US',
        'user-agent': 'Mozilla/5.0',
        'x-some-header': 'some value',
        'cf-connecting-ip': '203.0.113.195',
        'x-forwarded-for': '203.0.113.195, 2001:db8:85a3:8d3:1319:8a2e:370:7348',
      })
      const req = new Request(reqURL.toString(), { headers: reqHeaders, method: 'POST' })
      await worker.fetch(req, workerEnv)
      const expectedHeaders = new Headers(reqHeaders)
      expectedHeaders.set('FPJS-Proxy-Secret', 'proxy_secret')
      expectedHeaders.set('FPJS-Proxy-Client-IP', '203.0.113.195')
      expectedHeaders.set('FPJS-Proxy-Forwarded-Host', 'example.com')
      receivedHeaders.forEach((value, key) => {
        expect(expectedHeaders.get(key)).toBe(value)
      })
      expectedHeaders.forEach((value, key) => {
        expect(receivedHeaders.get(key)).toBe(value)
      })
    })
    test('POST req headers do not have cookies except _iidt', async () => {
      const reqHeaders = new Headers({
        accept: '*/*',
        'cache-control': 'no-cache',
        'accept-language': 'en-US',
        'user-agent': 'Mozilla/5.0',
        'x-some-header': 'some value',
        cookie:
          '_iidt=GlMQaHMfzYvomxCuA7Uymy7ArmjH04jPkT+enN7j/Xk8tJG+UYcQV+Qw60Ry4huw9bmDoO/smyjQp5vLCuSf8t4Jow==; auth_token=123456',
      })
      const req = new Request(reqURL.toString(), { headers: reqHeaders, method: 'POST' })
      await worker.fetch(req, workerEnv)
      expect(receivedHeaders.get('cookie')).toBe(
        '_iidt=GlMQaHMfzYvomxCuA7Uymy7ArmjH04jPkT+enN7j/Xk8tJG+UYcQV+Qw60Ry4huw9bmDoO/smyjQp5vLCuSf8t4Jow=='
      )
    })
    test('GET req headers do not have cookies (including _iidt)', async () => {
      const reqHeaders = new Headers({
        accept: '*/*',
        'cache-control': 'no-cache',
        'accept-language': 'en-US',
        'user-agent': 'Mozilla/5.0',
        'x-some-header': 'some value',
        cookie:
          '_iidt=GlMQaHMfzYvomxCuA7Uymy7ArmjH04jPkT+enN7j/Xk8tJG+UYcQV+Qw60Ry4huw9bmDoO/smyjQp5vLCuSf8t4Jow==; auth_token=123456',
      })
      const req = new Request(reqURL.toString(), { headers: reqHeaders, method: 'GET' })
      await worker.fetch(req, workerEnv)
      expect(receivedHeaders.get('cookie')).toBe(null)
    })
  })

  describe('ingress API request body', () => {
    let fetchSpy: MockInstance<typeof fetch>
    const reqURL = new URL(ingressUrl)
    let receivedBody = ''

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockImplementation(async (input, init) => {
        const req = new Request(input, init)
        receivedBody = await req.text()

        return new Response('')
      })
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('request body is not modified', async () => {
      const reqBody = 'some request body'
      const req = new Request(reqURL.toString(), { body: reqBody, method: 'POST' })
      await worker.fetch(req, workerEnv)
      expect(receivedBody).toBe(reqBody)
    })
  })

  describe('ingress API request HTTP method', () => {
    let fetchSpy: MockInstance<typeof fetch>
    const reqURL = new URL(ingressUrl)
    let requestMethod: string

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy.mockImplementation(async (input, init) => {
        const req = new Request(input, init)
        requestMethod = req.method

        return new Response('')
      })
    })

    beforeEach(() => {
      requestMethod = ''
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('when method is GET', async () => {
      const req = new Request(reqURL.toString(), { method: 'GET' })
      await worker.fetch(req, workerEnv)
      expect(requestMethod).toBe('GET')
    })

    test('when method is POST', async () => {
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      expect(requestMethod).toBe('POST')
    })

    test('when method is PUT', async () => {
      const req = new Request(reqURL.toString(), { method: 'PUT' })
      await worker.fetch(req, workerEnv)
      expect(requestMethod).toBe('PUT')
    })
  })

  describe('ingress API response headers for GET req', () => {
    let fetchSpy: MockInstance<typeof fetch>

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('response headers are the same (except HSTS)', async () => {
      const responseHeaders = new Headers({
        'access-control-allow-credentials': 'true',
        'access-control-expose-headers': 'Retry-After',
        'content-type': 'text/plain',
      })
      fetchSpy.mockImplementation(async () => {
        return new Response('', { headers: responseHeaders })
      })
      const req = new Request(ingressUrl, { method: 'GET' })
      const response = await worker.fetch(req, workerEnv)
      response.headers.forEach((value, key) => {
        expect(responseHeaders.get(key)).toBe(value)
      })
      responseHeaders.forEach((value, key) => {
        expect(response.headers.get(key)).toBe(value)
      })
    })
    test('strict-transport-security is removed', async () => {
      fetchSpy.mockImplementation(async () => {
        const headers = new Headers({
          'strict-transport-security': 'max-age=63072000',
        })
        return new Response('', { headers })
      })
      const req = new Request(ingressUrl, { method: 'GET' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.headers.get('strict-transport-security')).toBe(null)
    })
  })

  describe('ingress API response headers for POST req', () => {
    let fetchSpy: MockInstance<typeof fetch>

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('response headers are the same (except HSTS and set-cookie)', async () => {
      const responseHeaders = new Headers({
        'access-control-allow-credentials': 'true',
        'access-control-expose-headers': 'Retry-After',
        'content-type': 'text/plain',
      })
      fetchSpy.mockImplementation(async () => {
        return new Response('', { headers: responseHeaders })
      })
      const req = new Request(ingressUrl, { method: 'POST' })
      const response = await worker.fetch(req, workerEnv)
      response.headers.forEach((value, key) => {
        expect(responseHeaders.get(key)).toBe(value)
      })
      responseHeaders.forEach((value, key) => {
        expect(response.headers.get(key)).toBe(value)
      })
    })
    test('strict-transport-security is removed', async () => {
      fetchSpy.mockImplementation(async () => {
        const headers = new Headers({
          'strict-transport-security': 'max-age=63072000',
        })
        return new Response('', { headers })
      })
      const req = new Request(ingressUrl, { method: 'POST' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.headers.get('strict-transport-security')).toBe(null)
    })
  })

  describe('ingress API response body when successful', () => {
    let fetchSpy: MockInstance<typeof fetch>

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('body is unchanged', async () => {
      fetchSpy.mockImplementation(async () => {
        return new Response('some text')
      })
      const req = new Request(ingressUrl, { method: 'POST' })
      const response = await worker.fetch(req, workerEnv)
      expect(await response.text()).toBe('some text')
    })
  })

  describe('GET req response when failure', () => {
    let fetchSpy: MockInstance<typeof fetch>

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('body and headers are unchanged when ingress API fails', async () => {
      const responseHeaders = new Headers({
        'access-control-allow-credentials': 'true',
        'access-control-expose-headers': 'Retry-After',
        'content-type': 'text/plain',
      })
      fetchSpy.mockImplementation(async () => {
        return new Response('some error', { status: 500, headers: responseHeaders })
      })
      const req = new Request(ingressUrl, { method: 'GET' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.status).toBe(500)
      expect(await response.text()).toBe('some error')
      response.headers.forEach((value, key) => {
        expect(responseHeaders.get(key)).toBe(value)
      })
      responseHeaders.forEach((value, key) => {
        expect(response.headers.get(key)).toBe(value)
      })
    })
    test('error response when error inside the worker', async () => {
      fetchSpy.mockImplementation(async () => {
        throw new Error('some error')
      })
      const req = new Request(ingressUrl, { method: 'GET' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.status).toBe(500)
      const responseBody = await response.json<any>()
      // Note: toStrictEqual does not work for some reason, using double toMatchObject instead
      expect(responseBody).toMatchObject({ error: 'some error' })
      expect({ error: 'some error' }).toMatchObject(responseBody)
    })
  })

  describe('ingress API response when failure', () => {
    let fetchSpy: MockInstance<typeof fetch>

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('body and headers are unchanged when ingress API fails', async () => {
      const responseHeaders = new Headers({
        'access-control-allow-credentials': 'true',
        'access-control-expose-headers': 'Retry-After',
        'content-type': 'text/plain',
      })
      fetchSpy.mockImplementation(async () => {
        return new Response('some error', { status: 500, headers: responseHeaders })
      })
      const req = new Request(ingressUrl, { method: 'POST' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.status).toBe(500)
      expect(await response.text()).toBe('some error')
      response.headers.forEach((value, key) => {
        expect(responseHeaders.get(key)).toBe(value)
      })
      responseHeaders.forEach((value, key) => {
        expect(response.headers.get(key)).toBe(value)
      })
    })
    test('error response when error inside the worker', async () => {
      fetchSpy.mockImplementation(async () => {
        throw new Error('some error')
      })
      const req = new Request(ingressUrl, { method: 'POST' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.status).toBe(500)
      const responseBody = await response.json<FPJSResponse>()
      const expectedResponseBody: Omit<FPJSResponse, 'requestId'> = {
        v: '2',
        error: {
          code: 'IntegrationFailed',
          message: 'An error occurred with Cloudflare worker. Reason: some error',
        },
        products: {},
      }
      const requestId = responseBody.requestId
      expect(requestId).toMatch(/^\d{13}\.[a-zA-Z\d]{6}$/)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const modifiedResponseBody: Omit<FPJSResponse, 'requestId'> = (({ requestId, ...rest }) => ({ ...rest }))(
        responseBody
      )
      // Note: toStrictEqual does not work for some reason, using double toMatchObject instead
      expect(modifiedResponseBody).toMatchObject(expectedResponseBody)
      expect(expectedResponseBody).toMatchObject(modifiedResponseBody)
    })
  })

  describe('GET request cache durations', () => {
    let fetchSpy: MockInstance<typeof fetch>
    const reqURL = new URL(ingressUrl)
    let receivedCfObject: IncomingRequestCfProperties | RequestInitCfProperties | null | undefined = null

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    beforeEach(() => {
      receivedCfObject = null
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('browser cache is the same as the subrequest response', async () => {
      fetchSpy.mockImplementation(async () => {
        const responseHeaders = new Headers({
          'cache-control': 'max-age=2592000, immutable, private',
        })

        return new Response('', { headers: responseHeaders })
      })
      const req = new Request(reqURL.toString(), { method: 'GET' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.headers.get('cache-control')).toBe('max-age=2592000, immutable, private')
    })
    test('cloudflare network cache is not set', async () => {
      fetchSpy.mockImplementation(async (_, init) => {
        assert.isDefined(init)
        receivedCfObject = init.cf
        const responseHeaders = new Headers({
          'cache-control': 'public, max-age=3613, s-maxage=575500',
        })

        return new Response('', { headers: responseHeaders })
      })
      const req = new Request(reqURL.toString(), { method: 'GET' })
      await worker.fetch(req, workerEnv)
      expect(receivedCfObject).toBe(null)
    })
  })

  describe('POST request cache durations', () => {
    let fetchSpy: MockInstance<typeof fetch>
    const reqURL = new URL(ingressUrl)
    let receivedCfObject: IncomingRequestCfProperties | RequestInitCfProperties | null | undefined = null

    beforeAll(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch')
    })

    beforeEach(() => {
      receivedCfObject = null
    })

    afterAll(() => {
      fetchSpy.mockRestore()
    })

    test('cache-control is not added', async () => {
      fetchSpy.mockImplementation(async (_, init) => {
        assert.isDefined(init)
        receivedCfObject = init.cf
        const responseHeaders = new Headers({
          'access-control-allow-credentials': 'true',
          'access-control-expose-headers': 'Retry-After',
          'content-type': 'text/plain',
        })

        return new Response('', { headers: responseHeaders })
      })
      const req = new Request(reqURL.toString(), { method: 'POST' })
      const response = await worker.fetch(req, workerEnv)
      expect(response.headers.get('cache-control')).toBe(null)
    })
    test('cloudflare network cache is not set', async () => {
      fetchSpy.mockImplementation(async (_, init) => {
        assert.isDefined(init)
        receivedCfObject = init.cf
        const responseHeaders = new Headers({
          'access-control-allow-credentials': 'true',
          'access-control-expose-headers': 'Retry-After',
          'content-type': 'text/plain',
        })

        return new Response('', { headers: responseHeaders })
      })
      const req = new Request(reqURL.toString(), { method: 'POST' })
      await worker.fetch(req, workerEnv)
      expect(receivedCfObject).toBe(null)
    })
  })
})

describe('ingress API request proxy URL with suffix', () => {
  let fetchSpy: MockInstance<typeof fetch>
  let reqURL: URL
  let receivedReqURL = ''

  beforeAll(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockImplementation(async (input, init) => {
      const req = new Request(input, init)
      receivedReqURL = req.url
      return new Response()
    })
  })

  beforeEach(() => {
    reqURL = new URL('https://example.com/worker_path/suffix/more/path')

    receivedReqURL = ''
  })

  afterAll(() => {
    fetchSpy.mockRestore()
  })

  test('no region', async () => {
    const req = new Request(reqURL.toString(), { method: 'POST' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/suffix/more/path')
  })

  test('us region', async () => {
    reqURL.searchParams.append('region', 'us')
    const req = new Request(reqURL.toString(), { method: 'POST' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/suffix/more/path')
  })

  test('eu region', async () => {
    reqURL.searchParams.append('region', 'eu')
    const req = new Request(reqURL.toString(), { method: 'POST' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://eu.${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/suffix/more/path')
  })

  test('ap region', async () => {
    reqURL.searchParams.append('region', 'ap')
    const req = new Request(reqURL.toString(), { method: 'POST' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://ap.${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/suffix/more/path')
  })

  test('invalid region', async () => {
    reqURL.searchParams.append('region', 'foo.bar/baz')
    const req = new Request(reqURL.toString(), { method: 'POST' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/suffix/more/path')
  })

  test('suffix with dot', async () => {
    reqURL = new URL('https://example.com/worker_path/.suffix/more/path')
    reqURL.searchParams.append('region', 'ap')
    const req = new Request(reqURL.toString(), { method: 'POST' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://ap.${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/.suffix/more/path')
  })

  test('invalid region GET req', async () => {
    reqURL.searchParams.append('region', 'foo.bar/baz')
    const req = new Request(reqURL.toString(), { method: 'GET' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/suffix/more/path')
  })

  test('suffix with dot GET req', async () => {
    reqURL = new URL('https://example.com/worker_path/.suffix/more/path')
    reqURL.searchParams.append('region', 'ap')
    const req = new Request(reqURL.toString(), { method: 'GET' })
    await worker.fetch(req, workerEnv)
    const receivedURL = new URL(receivedReqURL)
    expect(receivedURL.origin).toBe(`https://ap.${config.ingressApi}`.toLowerCase())
    expect(receivedURL.pathname).toBe('/.suffix/more/path')
  })
})

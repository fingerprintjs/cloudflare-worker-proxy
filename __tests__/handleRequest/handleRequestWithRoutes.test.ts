import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest'
import { handleRequestWithRoutes, Route } from '../../src/handler'
import { getGetResultPath, getScriptDownloadPath, getStatusPagePath, WorkerEnv } from '../../src/env'
import { createRoutePathPrefix } from '../../src/utils'
import { config } from '../../src/config'
import { handleApiRequest } from '../../src/handlers'

vi.mock('../../src/handlers')

const workerPath = 'worker'
const agentScriptDownloadPath = 'agent'
const getResultPath = 'get-result'
const proxySecret = 'proxySecret'
const env: WorkerEnv = {
  FPJS_CDN_URL: config.fpcdn,
  FPJS_INGRESS_BASE_HOST: config.ingressApi,
  AGENT_SCRIPT_DOWNLOAD_PATH: agentScriptDownloadPath,
  GET_RESULT_PATH: getResultPath,
  PROXY_SECRET: proxySecret,
  INTEGRATION_PATH_DEPTH: 1,
}

describe('download Pro Agent Script', () => {
  let routes: Route[] = []
  let mockAgentDownloadHandler: Mock
  beforeEach(() => {
    mockAgentDownloadHandler = vi.fn()
    routes = [
      {
        pathPrefix: createRoutePathPrefix(getScriptDownloadPath(env)),
        handler: mockAgentDownloadHandler,
      },
    ]
  })
  test('standard path', async () => {
    const request = new Request(`https://example.com/${workerPath}/${agentScriptDownloadPath}`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockAgentDownloadHandler).toHaveBeenCalledTimes(1)
  })
  test('slash in the end', async () => {
    const request = new Request(`https://example.com/${workerPath}/${agentScriptDownloadPath}/`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockAgentDownloadHandler).toHaveBeenCalledTimes(1)
  })
  test('with query params', async () => {
    const request = new Request(`https://example.com/${workerPath}/${agentScriptDownloadPath}?key1=value1&key2=value2`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockAgentDownloadHandler).toHaveBeenCalledTimes(1)
  })
  test('HTTP Post method', async () => {
    const request = new Request(`https://example.com/${workerPath}/${agentScriptDownloadPath}`, { method: 'POST' })
    await handleRequestWithRoutes(request, env, routes)
    expect(mockAgentDownloadHandler).toHaveBeenCalledTimes(1)
  })
  test('with prefix', async () => {
    const request = new Request(`https://example.com/foobar/${agentScriptDownloadPath}`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockAgentDownloadHandler).toHaveBeenCalled()
  })
  test('incorrect path', async () => {
    const request = new Request(`https://example.com/${agentScriptDownloadPath}/some-path`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockAgentDownloadHandler).not.toHaveBeenCalled()
  })
})

describe('get GetResult', () => {
  let routes: Route[] = []
  let mockIngressAPIHandler: Mock
  beforeEach(() => {
    mockIngressAPIHandler = vi.fn()
    routes = [
      {
        pathPrefix: createRoutePathPrefix(getGetResultPath(env)),
        handler: mockIngressAPIHandler,
      },
    ]
  })
  test('standard path', async () => {
    const request = new Request(`https://example.com/${workerPath}/${getResultPath}`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).toHaveBeenCalledTimes(1)
  })
  test('slash in the end', async () => {
    const request = new Request(`https://example.com/${workerPath}/${getResultPath}/`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).toHaveBeenCalledTimes(1)
  })
  test('with query params', async () => {
    const request = new Request(`https://example.com/${workerPath}/${getResultPath}?key1=value1&key2=value2`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).toHaveBeenCalledTimes(1)
  })
  test('HTTP Post method', async () => {
    const request = new Request(`https://example.com/${workerPath}/${getResultPath}`, { method: 'POST' })
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).toHaveBeenCalledTimes(1)
  })
  test('with prefix', async () => {
    const request = new Request(`https://example.com/foobar/${getResultPath}`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).toHaveBeenCalled()
  })
  test('with suffix', async () => {
    const request = new Request(`https://example.com/${workerPath}/${getResultPath}/some-path`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).toHaveBeenCalled()
  })
  test('incorrect path', async () => {
    const request = new Request(`https://example.com/${workerPath}/${getResultPath}foobar`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockIngressAPIHandler).not.toHaveBeenCalled()
  })
})

describe('status page', () => {
  let routes: Route[] = []
  let mockStatusPageHandler: Mock
  beforeEach(() => {
    mockStatusPageHandler = vi.fn()
    routes = [
      {
        pathPrefix: createRoutePathPrefix(getStatusPagePath()),
        handler: mockStatusPageHandler,
      },
    ]
  })
  test('standard path', async () => {
    const request = new Request(`https://example.com/${workerPath}/status`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockStatusPageHandler).toHaveBeenCalledTimes(1)
  })
  test('slash in the end', async () => {
    const request = new Request(`https://example.com/${workerPath}/status/`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockStatusPageHandler).toHaveBeenCalledTimes(1)
  })
  test('with query params', async () => {
    const request = new Request(`https://example.com/${workerPath}/status?key1=value1&key2=value2`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockStatusPageHandler).toHaveBeenCalledTimes(1)
  })
  test('HTTP Post method', async () => {
    const request = new Request(`https://example.com/${workerPath}/status`, { method: 'POST' })
    await handleRequestWithRoutes(request, env, routes)
    expect(mockStatusPageHandler).toHaveBeenCalledTimes(1)
  })
  test('with prefix', async () => {
    const request = new Request(`https://example.com/foobar/status`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockStatusPageHandler).toHaveBeenCalled()
  })
  test('incorrect path', async () => {
    const request = new Request(`https://example.com/status/some-path`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockStatusPageHandler).not.toHaveBeenCalled()
  })
})

describe('default route', () => {
  let routes: Route[] = []
  const mockApiRequestHandler = vi.mocked(handleApiRequest)
  let mockIngressAPIHandler: Mock
  beforeEach(() => {
    mockApiRequestHandler.mockReset()

    mockIngressAPIHandler = vi.fn()
    routes = [
      {
        pathPrefix: createRoutePathPrefix(getGetResultPath(env)),
        handler: mockIngressAPIHandler,
      },
    ]
  })

  test('standard path', async () => {
    const request = new Request(`https://example.com/${workerPath}`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockApiRequestHandler).toHaveBeenCalledTimes(1)
    expect(mockIngressAPIHandler).not.toHaveBeenCalled()
  })

  test('slash in the end', async () => {
    const request = new Request(`https://example.com/${workerPath}`)
    await handleRequestWithRoutes(request, env, routes)
    expect(mockApiRequestHandler).toHaveBeenCalledTimes(1)
    expect(mockIngressAPIHandler).not.toHaveBeenCalled()
  })

  test.each([['GET', 'POST']])('different than get result path suffix - method = %s', async (method) => {
    const request = new Request(`https://example.com/${workerPath}/web/v4`, { method })
    await handleRequestWithRoutes(request, env, routes)
    expect(mockApiRequestHandler).toHaveBeenCalledTimes(1)
    expect(mockIngressAPIHandler).not.toHaveBeenCalled()
  })
})

describe('no match paths', () => {
  let routes: Route[] = []
  let mockAgentDownloadHandler: Mock
  let mockIngressAPIHandler: Mock
  let mockStatusPageHandler: Mock
  beforeEach(() => {
    mockAgentDownloadHandler = vi.fn()
    mockIngressAPIHandler = vi.fn()
    mockStatusPageHandler = vi.fn()
    routes = [
      {
        pathPrefix: createRoutePathPrefix(getScriptDownloadPath(env)),
        handler: mockAgentDownloadHandler,
      },
      {
        pathPrefix: createRoutePathPrefix(getGetResultPath(env)),
        handler: mockIngressAPIHandler,
      },
      {
        pathPrefix: createRoutePathPrefix(getStatusPagePath()),
        handler: mockStatusPageHandler,
      },
    ]
  })

  test.each([['https://example.com/hello', { ...env, INTEGRATION_PATH_DEPTH: 2 }]])(
    'no match - %s',
    async (url, testEnv) => {
      const reqUrl = new URL(url)
      const request = new Request(reqUrl)
      const response = await handleRequestWithRoutes(request, testEnv, routes)
      expect(mockAgentDownloadHandler).not.toHaveBeenCalled()
      expect(mockIngressAPIHandler).not.toHaveBeenCalled()
      expect(mockStatusPageHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(404)
      expect(response.headers.get('content-type')).toBe('application/json')
      const responseBody = await response.json<any>()
      const expected = { error: `unmatched path ${reqUrl.pathname}` }
      expect(responseBody).toMatchObject(expected)
      expect(expected).toMatchObject(responseBody)
    }
  )
})

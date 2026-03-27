import {
  getScriptDownloadPath,
  getGetResultPath,
  WorkerEnv,
  getStatusPagePath,
  getIntegrationPathDepth,
  getIngressBaseHost,
  isScriptDownloadPathSet,
  isGetResultPathSet,
} from './env'

import { handleApiRequest, handleStatusPage } from './handlers'
import { getIngressEndpoint, createRoutePathPrefix, stripPrefixPathSegments, getAgentScriptEndpoint } from './utils'

export type Route = {
  /**
   * The route will match if request URL path after the integration
   * path is:
   * - `/${pathPrefix}`
   * - `/${pathPrefix}/.*`
   */
  pathPrefix: string

  /**
   * The request handler for the route
   *
   * @param request the {@link Request} the worker received
   * @param env the {@link WorkerEnv}
   * @param receivedRequestURL the {@link URL} for the received request
   * @param targetPath the URL path with the integration path removed
   * @returns the {@link Response} to return to the client
   */
  handler: (
    request: Request,
    env: WorkerEnv,
    receivedRequestURL: URL,
    targetPath: string
  ) => Response | Promise<Response>
}

function copySearchParams(oldURL: URL, newURL: URL): void {
  newURL.search = new URLSearchParams(oldURL.search).toString()
}

function createIngressRequestURL(env: WorkerEnv, receivedRequestURL: URL, targetPath: string) {
  const ingressBaseUrl = getIngressBaseHost(env)!

  const endpoint = getIngressEndpoint(ingressBaseUrl, receivedRequestURL.searchParams, targetPath)
  const newURL = new URL(endpoint)
  copySearchParams(receivedRequestURL, newURL)

  return newURL
}

function createAgentScriptURL(env: WorkerEnv, receivedRequestURL: URL) {
  const ingressBaseUrl = getIngressBaseHost(env)!

  const agentScriptEndpoint = getAgentScriptEndpoint(ingressBaseUrl, receivedRequestURL.searchParams)
  const newURL = new URL(agentScriptEndpoint)
  copySearchParams(receivedRequestURL, newURL)

  return newURL
}

const DEFAULT_ROUTE: Route['handler'] = (request, env, receivedRequestURL, targetPath) =>
  handleApiRequest(request, env, createIngressRequestURL(env, receivedRequestURL, targetPath))

function createRoutes(env: WorkerEnv): Route[] {
  const routes: Route[] = []

  if (isScriptDownloadPathSet(env)) {
    const downloadScriptRoute: Route = {
      pathPrefix: createRoutePathPrefix(getScriptDownloadPath(env)),
      handler: (request, env, receivedRequestURL) =>
        handleApiRequest(request, env, createAgentScriptURL(env, receivedRequestURL)),
    }
    routes.push(downloadScriptRoute)
  }

  if (isGetResultPathSet(env)) {
    const ingressAPIRoute: Route = {
      pathPrefix: createRoutePathPrefix(getGetResultPath(env)),
      handler: DEFAULT_ROUTE,
    }
    routes.push(ingressAPIRoute)
  }

  const statusRoute: Route = {
    pathPrefix: createRoutePathPrefix(getStatusPagePath()),
    handler: handleStatusPage,
  }
  routes.push(statusRoute)

  return routes
}

function handleNoMatch(urlPathname: string): Response {
  const responseHeaders = new Headers({
    'content-type': 'application/json',
  })

  return new Response(JSON.stringify({ error: `unmatched path ${urlPathname}` }), {
    status: 404,
    headers: responseHeaders,
  })
}

export function handleRequestWithRoutes(
  request: Request,
  env: WorkerEnv,
  routes: Route[]
): Promise<Response> | Response {
  const url = new URL(request.url)
  const routeMatchingPath = stripPrefixPathSegments(url, getIntegrationPathDepth(env))
  if (routeMatchingPath) {
    for (const route of routes) {
      if (routeMatchingPath === route.pathPrefix || routeMatchingPath.startsWith(`${route.pathPrefix}/`)) {
        const targetPath = routeMatchingPath.slice(route.pathPrefix.length) || '/'
        return route.handler(request, env, url, targetPath)
      }
    }

    // If the request doesn't match any of the routes, handle it as an API request.
    return DEFAULT_ROUTE(request, env, url, routeMatchingPath)
  }

  // This should not occur in practice because the route patterns for
  // the worker are expected to prevent this case.
  return handleNoMatch(url.pathname)
}

export async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const routes = createRoutes(env)
  return handleRequestWithRoutes(request, env, routes)
}

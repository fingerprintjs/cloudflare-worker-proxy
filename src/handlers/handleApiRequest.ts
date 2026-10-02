import { WorkerEnv } from '../env'
import {
  addProxyIntegrationHeaders,
  createErrorResponseForIngress,
  createFallbackErrorResponse,
  filterCookies,
} from '../utils'
import { addTrafficMonitoringSearchParamsForIngressRequest } from '../utils/addTrafficMonitoring'

export async function handleApiRequest(receivedRequest: Request, env: WorkerEnv, targetURL: URL): Promise<Response> {
  const methodAuthorized = isMethodAuthorized(receivedRequest.method)
  try {
    let fingerprintRequest: Request<unknown, CfProperties<unknown>>
    if (!methodAuthorized) {
      const headers = new Headers(receivedRequest.headers)
      headers.delete('Cookie')

      fingerprintRequest = new Request(targetURL, new Request(receivedRequest, { headers }))
    } else {
      addTrafficMonitoringSearchParamsForIngressRequest(targetURL)

      const headers = filterCookies(new Headers(receivedRequest.headers), (key) => key === '_iidt')
      addProxyIntegrationHeaders(headers, receivedRequest.url, env)

      fingerprintRequest = new Request(
        targetURL,
        new Request(receivedRequest, updateRequestInitForIngress({ headers, body: receivedRequest.body }))
      )
    }

    console.log(`Sending ${fingerprintRequest.method} to ${fingerprintRequest.url}...`)
    // The response is copied so that its headers stay mutable, because headers on a `fetch`
    // response are immutable and `returnHttpResponse` strips `Strict-Transport-Security`.
    return await fetch(fingerprintRequest).then((originResponse) => new Response(originResponse.body, originResponse))
  } catch (e) {
    if (!methodAuthorized) {
      return createFallbackErrorResponse(e)
    }

    return createErrorResponseForIngress(receivedRequest, e)
  }
}

export function isMethodAuthorized(method: string) {
  return method === 'POST'
}

function updateRequestInitForIngress(
  requestInit: RequestInit<CfProperties<unknown>>
): RequestInit<CfProperties<unknown>> {
  if (import.meta.env.MODE !== 'production') {
    // The local worker runtime requires duplex half when making a fetch
    // that is streaming the request body and receiving a response body.
    //
    // This requirement comes from the undici client used by the workers
    // runtime to implement fetch.
    //
    // This is not required by the deployed workers runtime. By wrapping this
    // modification in the meta.env.MODE check, the production build will
    // omit this if branch.
    //
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return {
      ...requestInit,
      duplex: 'half',
    } as unknown as RequestInit<CfProperties<unknown>>
  }

  return requestInit
}

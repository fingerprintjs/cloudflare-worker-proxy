const INT_VERSION = __current_worker_version__
const PARAM_NAME = 'ii'

function getTrafficMonitoringValue(type: 'procdn' | 'ingress'): string {
  return `fingerprintjs-pro-cloudflare/${INT_VERSION}/${type}`
}

export function addTrafficMonitoringSearchParamsForIngressRequest(url: URL) {
  url.searchParams.append(PARAM_NAME, getTrafficMonitoringValue('ingress'))
}

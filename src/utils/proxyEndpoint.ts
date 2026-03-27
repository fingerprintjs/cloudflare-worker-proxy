export const DEFAULT_AGENT_VERSION = '3'

export function getAgentScriptEndpoint(baseCdnUrl: string, searchParams: URLSearchParams): string {
  const apiKey = searchParams.get('apiKey')
  const apiVersion = searchParams.get('version') || DEFAULT_AGENT_VERSION

  const base = `https://${baseCdnUrl}/web/v${apiVersion}/${apiKey}`
  const loaderVersion = searchParams.get('loaderVersion')
  const lv = loaderVersion ? `/loader_v${loaderVersion}.js` : ''

  return `${base}${lv}`
}

export function getIngressEndpoint(baseIngressUrl: string, searchParams: URLSearchParams, targetPath: string): string {
  if (!targetPath.startsWith('/')) {
    throw new Error('targetPath must start with /')
  }

  const region = searchParams.get('region') || 'us'
  let prefix = ''
  switch (region) {
    case 'eu':
      prefix = 'eu.'
      break
    case 'ap':
      prefix = 'ap.'
      break
    default:
      prefix = ''
      break
  }
  return `https://${prefix}${baseIngressUrl}${targetPath}`
}

import { config } from './config'

export type WorkerEnv = {
  AGENT_SCRIPT_DOWNLOAD_PATH: string | null
  GET_RESULT_PATH: string | null
  PROXY_SECRET: string | null
  FPJS_INGRESS_BASE_HOST: string | null
  INTEGRATION_PATH_DEPTH: number | string | null
}

export const Defaults = {
  AGENT_SCRIPT_DOWNLOAD_PATH: null,
  GET_RESULT_PATH: null,
  PROXY_SECRET: null,
  FPJS_INGRESS_BASE_HOST: config.ingressApi,
  INTEGRATION_PATH_DEPTH: 1,
} satisfies WorkerEnv

function getVarOrDefault<K extends keyof WorkerEnv>(
  variable: K,
  defaults: WorkerEnv
): (env: WorkerEnv) => WorkerEnv[K] {
  return function (env: WorkerEnv): WorkerEnv[K] {
    return env[variable] || defaults[variable]
  }
}

function isVarSet(variable: keyof WorkerEnv): (env: WorkerEnv) => boolean {
  return function (env: WorkerEnv): boolean {
    return Boolean(env[variable])
  }
}

const getIngressBaseHostVar = getVarOrDefault('FPJS_INGRESS_BASE_HOST', Defaults)

export function getIngressBaseHost(env: WorkerEnv): string {
  const ingressBaseHost = getIngressBaseHostVar(env)
  if (ingressBaseHost === null) {
    throw new Error('FPJS_INGRESS_BASE_HOST is not set and no default is available')
  }
  return ingressBaseHost
}

export const agentScriptDownloadPathVarName = 'AGENT_SCRIPT_DOWNLOAD_PATH'
const getAgentPathVar = getVarOrDefault(agentScriptDownloadPathVarName, Defaults)
export const isScriptDownloadPathSet = isVarSet(agentScriptDownloadPathVarName)

export function getScriptDownloadPath(env: WorkerEnv): string {
  const agentPathVar = getAgentPathVar(env)
  return `/${agentPathVar}`
}

export const getResultPathVarName = 'GET_RESULT_PATH'
const getGetResultPathVar = getVarOrDefault(getResultPathVarName, Defaults)
export const isGetResultPathSet = isVarSet(getResultPathVarName)

export function getGetResultPath(env: WorkerEnv): string {
  const getResultPathVar = getGetResultPathVar(env)
  return `/${getResultPathVar}`
}

export const proxySecretVarName = 'PROXY_SECRET'
const getProxySecretVar = getVarOrDefault(proxySecretVarName, Defaults)
export const isProxySecretSet = isVarSet(proxySecretVarName)

export function getProxySecret(env: WorkerEnv): string | null {
  return getProxySecretVar(env)
}

export function getStatusPagePath(): string {
  return `/status`
}

export const integrationPathDepthVarName = 'INTEGRATION_PATH_DEPTH'
function normalizeIntegrationPathDepth(env: WorkerEnv): number | null {
  const integrationPathDepth = env[integrationPathDepthVarName]
  if (integrationPathDepth === null || integrationPathDepth === undefined || integrationPathDepth === '') {
    return null
  }
  return typeof integrationPathDepth === 'string' ? Number(integrationPathDepth) : integrationPathDepth
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && !Object.is(value, -0)
}

export function envHasValidIntegrationPathDepth(env: WorkerEnv) {
  const integrationPathDepth = normalizeIntegrationPathDepth(env)
  if (integrationPathDepth === null) {
    return true
  }
  return isNonNegativeInteger(integrationPathDepth)
}

export function getIntegrationPathDepth(env: WorkerEnv): number {
  const integrationPathDepth = normalizeIntegrationPathDepth(env)
  if (integrationPathDepth === null) {
    return Defaults.INTEGRATION_PATH_DEPTH
  }

  if (!isNonNegativeInteger(integrationPathDepth)) {
    console.warn(
      `INTEGRATION_PATH_DEPTH must be an integer greater than or equal to 0, defaulting to ${Defaults.INTEGRATION_PATH_DEPTH}`
    )
    return Defaults.INTEGRATION_PATH_DEPTH
  }

  return integrationPathDepth
}

import { config } from './config'

export type WorkerEnv = {
  AGENT_SCRIPT_DOWNLOAD_PATH: string | null
  GET_RESULT_PATH: string | null
  PROXY_SECRET: string | null
  FPJS_INGRESS_BASE_HOST: string | null
  INTEGRATION_PATH_DEPTH: number | null
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
    return !!env[variable]
  }
}

export const getIngressBaseHost = getVarOrDefault('FPJS_INGRESS_BASE_HOST', Defaults)

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
export function isIntegrationPathDepthValid(env: WorkerEnv) {
  const integrationPathDepth = env[integrationPathDepthVarName]
  if (integrationPathDepth !== null) {
    return Number.isInteger(integrationPathDepth) && integrationPathDepth > 0
  }

  // The default value is valid
  return true
}

export function getIntegrationPathDepth(env: WorkerEnv): number {
  const integrationPathDepth = env[integrationPathDepthVarName]
  if (integrationPathDepth !== null) {
    if (!Number.isInteger(integrationPathDepth) || integrationPathDepth <= 0) {
      console.warn(
        `INTEGRATION_PATH_DEPTH must be an integer and greater than 0, defaulting to ${Defaults.INTEGRATION_PATH_DEPTH}`
      )
      return Defaults.INTEGRATION_PATH_DEPTH
    }
    return integrationPathDepth
  }
  return Defaults.INTEGRATION_PATH_DEPTH
}

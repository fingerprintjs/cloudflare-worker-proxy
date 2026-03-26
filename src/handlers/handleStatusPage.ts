import {
  WorkerEnv,
  isScriptDownloadPathSet,
  isGetResultPathSet,
  isProxySecretSet,
  agentScriptDownloadPathVarName,
  getResultPathVarName,
  proxySecretVarName,
  isIntegrationPathDepthValid,
  integrationPathDepthVarName,
} from '../env'

function generateNonce() {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const indices = crypto.getRandomValues(new Uint8Array(24))
  for (const index of indices) {
    result += characters[index % characters.length]
  }
  return btoa(result)
}

function buildHeaders(styleNonce: string): Headers {
  const headers = new Headers()
  headers.append('Content-Type', 'text/html')
  headers.append(
    'Content-Security-Policy',
    `default-src 'none'; img-src https://fingerprint.com; style-src 'nonce-${styleNonce}'`
  )
  return headers
}

function createWorkerVersionElement(): string {
  return `
  <span>
  ℹ️ Worker version: ${__current_worker_version__}
  </span>
  `
}

function createContactInformationElement(): string {
  return `
  <span>
  ❓Please contact <a href='mailto:support@fingerprint.com'>support@fingerprint.com</a> with any issues.
  </span>
  `
}

function createEnvVarsInformationElement(env: WorkerEnv): string {
  const isScriptDownloadPathAvailable = isScriptDownloadPathSet(env)
  const isGetResultPathAvailable = isGetResultPathSet(env)
  const isProxySecretAvailable = isProxySecretSet(env)
  const isIntegrationPathDepthAvailable = isIntegrationPathDepthValid(env)

  const isAllRequiredVarsAvailable = isProxySecretAvailable && isIntegrationPathDepthAvailable
  const isAllV3VarsAvailable = isScriptDownloadPathAvailable && isGetResultPathAvailable

  let requiredResult = '<h2>Required Variables</h2>'
  if (!isAllRequiredVarsAvailable) {
    requiredResult += `
    <span>
    🚨 The following required environment variables are not defined or invalid:
    </span>
    `
    if (!isProxySecretAvailable) {
      requiredResult += `
      <span>
      🔴 <strong>${proxySecretVarName} </strong> is not set
      </span>
      `
    }
    if (!isIntegrationPathDepthAvailable) {
      requiredResult += `
      <span>
      🔴 <strong>${integrationPathDepthVarName} </strong> is not valid. The default value of 1 will be used instead.
      </span>
      `
    }
  } else {
    requiredResult += `
    <span>
     ✅ All required environment variables are set.
    </span>
    `
  }

  let v3Result = '<h2>V3 API Variables</h2>'
  if (!isAllV3VarsAvailable) {
    v3Result += `
    <span>
    ⚠️ The following environment variables are not defined or invalid. <br />
    If you are not using the v3 API, these warnings can be safely ignored.
    </span>
    `
    if (!isScriptDownloadPathAvailable) {
      v3Result += `
      <span>
      🟡 <strong>${agentScriptDownloadPathVarName} </strong> is not set
      </span>
      `
    }
    if (!isGetResultPathAvailable) {
      v3Result += `
      <span>
      🟡 <strong>${getResultPathVarName} </strong> is not set
      </span>
      `
    }
    v3Result += `
    <span>
    </span>
    `
  } else {
    v3Result += `
    <span>
    ✅ All v3 API environment variables are set.
    </span>
    `
  }
  return requiredResult + v3Result
}

function buildBody(env: WorkerEnv, styleNonce: string): string {
  let body = `
  <html lang='en-US'>
  <head>
    <meta charset='utf-8'/>
    <title>Fingerprint Pro Cloudflare Worker</title>
    <link rel='icon' type='image/x-icon' href='https://fingerprint.com/img/favicon.ico'>
    <style nonce='${styleNonce}'>
      h1, span {
        display: block;
        padding-top: 1em;
        padding-bottom: 1em;
        text-align: center;
      }
      h2 {
        display: block;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <h1>Fingerprint Pro Cloudflare Integration</h1>
  `

  body += `<span>🎉 Your Cloudflare worker is deployed</span>`

  body += createWorkerVersionElement()
  body += createEnvVarsInformationElement(env)
  body += createContactInformationElement()

  body += `  
  </body>
  </html>
  `
  return body
}

export function handleStatusPage(request: Request, env: WorkerEnv): Response {
  if (request.method !== 'GET') {
    return new Response(null, { status: 405 })
  }

  const styleNonce = generateNonce()
  const headers = buildHeaders(styleNonce)
  const body = buildBody(env, styleNonce)

  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers,
  })
}

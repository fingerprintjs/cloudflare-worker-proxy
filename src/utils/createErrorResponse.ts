export interface FPJSResponse {
  v: '2'
  notifications?: Notification[]
  requestId: string
  error?: ErrorData
  products: Record<string, never>
}

export interface Notification {
  level: 'info' | 'warning' | 'error'
  message: string
}

export interface ErrorData {
  code?: 'IntegrationFailed'
  message: string
}

function errorToString(error: string | Error | unknown): string {
  try {
    return typeof error === 'string' ? error : error instanceof Error ? error.message : String(error)
  } catch {
    return 'unknown'
  }
}

function generateRandomString(length: number): string {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

function generateRequestUniqueId(): string {
  return generateRandomString(6)
}

function generateRequestId(): string {
  const uniqueId = generateRequestUniqueId()
  const now = new Date().getTime()
  return `${now}.${uniqueId}`
}

export function createErrorResponseForIngress(request: Request, error: string | Error | unknown): Response {
  const reason = errorToString(error)
  const errorBody: ErrorData = {
    code: 'IntegrationFailed',
    message: `An error occurred with Cloudflare worker. Reason: ${reason}`,
  }
  const responseBody: FPJSResponse = {
    v: '2',
    error: errorBody,
    requestId: generateRequestId(),
    products: {},
  }
  const requestOrigin = request.headers.get('origin') || ''
  const responseHeaders: HeadersInit = {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'content-type': 'application/json',
  }
  return new Response(JSON.stringify(responseBody), { status: 500, headers: responseHeaders })
}

export function createFallbackErrorResponse(error: string | Error | unknown): Response {
  const responseBody = { error: errorToString(error) }
  return new Response(JSON.stringify(responseBody), { status: 500, headers: { 'content-type': 'application/json' } })
}

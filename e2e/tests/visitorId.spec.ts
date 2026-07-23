import { test, expect, Page, request, APIRequestContext, Locator } from '@playwright/test'
import { areVisitorIdAndRequestIdValid, wait } from '../utils'

const INT_VERSION = process.env.worker_version || ''
const WORKER_PATH = process.env.worker_path || 'fpjs-worker-default'
const GET_RESULT_PATH = process.env.get_result_path || 'get-result-default'
const AGENT_DOWNLOAD_PATH = process.env.agent_download_path || 'agent-download-default'

const testWebsiteURLV3 = new URL(`https://${process.env.test_client_domain}`)
testWebsiteURLV3.searchParams.set('worker-path', WORKER_PATH)
testWebsiteURLV3.searchParams.set('get-result-path', GET_RESULT_PATH)
testWebsiteURLV3.searchParams.set('agent-download-path', AGENT_DOWNLOAD_PATH)

const testWebsiteURLV4 = new URL(`https://${process.env.test_client_domain}`)
testWebsiteURLV4.searchParams.set('worker-path', WORKER_PATH)
testWebsiteURLV4.searchParams.set('v4', 'true')

const testCases: [string, URL][] = [
  ['v3', testWebsiteURLV3],
  ['v4', testWebsiteURLV4],
]

const workerDomain = process.env.test_client_domain

// How long to wait for the result element to render and populate with valid JSON.
const RESULT_TIMEOUT_MS = 30000

interface GetResult {
  requestId: string
  visitorId: string
  visitorFound: boolean
}

interface V4GetResult {
  event_id: string
  visitor_id: string
}

type Result = GetResult | V4GetResult

function hasStringProperty(value: unknown, key: string): boolean {
  return typeof value === 'object' && value !== null && key in value && typeof Reflect.get(value, key) === 'string'
}

function isResult(value: unknown): value is Result {
  return (
    (hasStringProperty(value, 'event_id') && hasStringProperty(value, 'visitor_id')) ||
    (hasStringProperty(value, 'requestId') && hasStringProperty(value, 'visitorId'))
  )
}

function getResultIds(jsonContent: Result): { visitorId: string; requestId: string } {
  if ('event_id' in jsonContent) {
    return {
      visitorId: jsonContent.visitor_id,
      requestId: jsonContent.event_id,
    }
  }

  return {
    visitorId: jsonContent.visitorId,
    requestId: jsonContent.requestId,
  }
}

test.describe('visitorId', () => {
  async function waitUntilOnline(
    reqContext: APIRequestContext,
    expectedVersion: string,
    retryCounter = 0,
    maxRetries = 10
  ): Promise<boolean> {
    const statusEndpoint = `https://${workerDomain}/${WORKER_PATH}/status`
    console.log({ statusEndpoint })
    const res = await reqContext.get(statusEndpoint)
    try {
      const responseBody = await res.text()
      if (responseBody.includes('Your Cloudflare worker is deployed')) {
        const matches = responseBody.match(/Worker version: (.+)/)
        if (matches && matches.length > 0) {
          const version = matches[1]
          if (version === expectedVersion) {
            return Promise.resolve(true)
          }
        }
      }
    } catch (e) {
      // do nothing
    }

    const newRetryCounter = retryCounter + 1
    if (newRetryCounter > maxRetries) {
      return Promise.resolve(false)
    }

    await wait(1000)
    return waitUntilOnline(reqContext, expectedVersion, newRetryCounter, maxRetries)
  }

  async function testForElement(locator: Locator) {
    // Fold the visibility check into the poll so the whole wait shares a single
    // timeout budget instead of stacking a separate (short) visibility timeout
    // in front of it.
    await expect
      .poll(
        async () => {
          if (!(await locator.isVisible())) {
            return false
          }

          const textContent = await locator.textContent()
          if (typeof textContent !== 'string' || textContent.trim() === '') {
            return false
          }

          try {
            const jsonContent = JSON.parse(textContent)
            if (!isResult(jsonContent)) {
              return false
            }
            const { visitorId, requestId } = getResultIds(jsonContent)
            return areVisitorIdAndRequestIdValid(visitorId, requestId)
          } catch {
            return false
          }
        },
        {
          message: 'Expected the result element to contain a valid visitor result',
          timeout: RESULT_TIMEOUT_MS,
        }
      )
      .toBe(true)
  }

  async function runTest(page: Page, url: string) {
    console.log(`Running goto url: ${url}...`)
    await page.goto(url, {
      waitUntil: 'networkidle',
    })

    // Wait for both result blocks concurrently so the total wait is capped at a
    // single RESULT_TIMEOUT_MS budget rather than the sum of both.
    await Promise.all([
      testForElement(page.locator('#result > code')),
      testForElement(page.locator('#cdn-result > code')),
    ])
  }

  for (const [name, url] of testCases) {
    test(`should show visitorId in the HTML (NPM & CDN) - ${name}`, async ({ page }) => {
      const reqContext = await request.newContext()
      const isOnline = await waitUntilOnline(reqContext, INT_VERSION)
      expect(isOnline).toBeTruthy()

      await runTest(page, url.href)
    })
  }
})

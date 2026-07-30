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

// How long to wait, per page load, for both result blocks to render and populate
// with valid JSON before giving up on that load and reloading.
const RESULT_TIMEOUT_MS = 15000

// How many times to reload the page before failing.
const MAX_PAGE_ATTEMPTS = 3

// How often to re-check the result blocks while waiting within a single page load.
const RESULT_POLL_INTERVAL_MS = 500

// The result block renders JSON as either v3 { visitorId, requestId } or
// v4 { visitor_id, event_id }. We only need it to eventually expose a well-formed
// id pair; areVisitorIdAndRequestIdValid rejects anything missing or malformed.
function hasValidResult(text: string): boolean {
  let json: Record<string, string>
  try {
    json = JSON.parse(text)
  } catch {
    return false
  }
  if (typeof json !== 'object' || json === null) {
    return false
  }
  return areVisitorIdAndRequestIdValid(json.visitorId ?? json.visitor_id, json.requestId ?? json.event_id)
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
    } catch {
      // do nothing
    }

    const newRetryCounter = retryCounter + 1
    if (newRetryCounter > maxRetries) {
      return Promise.resolve(false)
    }

    await wait(1000)
    return waitUntilOnline(reqContext, expectedVersion, newRetryCounter, maxRetries)
  }

  async function elementHasValidResult(locator: Locator): Promise<boolean> {
    return (await locator.isVisible()) && hasValidResult((await locator.textContent()) ?? '')
  }

  // Poll both result blocks until they hold a valid id pair or the timeout elapses.
  async function waitForResults(page: Page, timeout: number): Promise<boolean> {
    const deadline = Date.now() + timeout
    do {
      if (
        (await elementHasValidResult(page.locator('#result > code'))) &&
        (await elementHasValidResult(page.locator('#cdn-result > code')))
      ) {
        return true
      }
      await wait(RESULT_POLL_INTERVAL_MS)
    } while (Date.now() < deadline)
    return false
  }

  async function runTest(page: Page, url: string) {
    for (let attempt = 1; attempt <= MAX_PAGE_ATTEMPTS; attempt++) {
      console.log(`Running goto url (attempt ${attempt}/${MAX_PAGE_ATTEMPTS}): ${url}...`)
      try {
        // Navigation can itself fail, so retry it too rather than aborting the loop on the first error.
        await page.goto(url, { waitUntil: 'domcontentloaded' })
      } catch (err) {
        console.log(`Navigation failed on attempt ${attempt}/${MAX_PAGE_ATTEMPTS}: ${String(err)}`)
        if (attempt === MAX_PAGE_ATTEMPTS) {
          throw err
        }
        continue
      }

      if (await waitForResults(page, RESULT_TIMEOUT_MS)) {
        return
      }
      console.log(`Attempt ${attempt} did not yield a valid result within ${RESULT_TIMEOUT_MS}ms`)
    }

    throw new Error(
      `Expected both result elements to contain a valid visitor result within ${MAX_PAGE_ATTEMPTS} page loads`
    )
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

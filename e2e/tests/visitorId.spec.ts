import { test, expect, Page, request, APIRequestContext, ElementHandle } from '@playwright/test'
import { areVisitorIdAndRequestIdValid, wait } from '../utils'
import assert from 'node:assert'

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

  async function testForElement(el: ElementHandle<SVGElement | HTMLElement>) {
    const textContent = await el.textContent()
    expect(textContent != null).toStrictEqual(true)
    assert(typeof textContent === 'string')

    let jsonContent: Result | undefined
    try {
      jsonContent = JSON.parse(textContent)
    } catch (e) {
      // do nothing
    }
    assert(jsonContent)

    let visitorId = ''
    let requestId = ''
    if ('event_id' in jsonContent) {
      visitorId = jsonContent.visitor_id
      requestId = jsonContent.event_id
    } else if ('requestId' in jsonContent) {
      visitorId = jsonContent.visitorId
      requestId = jsonContent.requestId
    }
    expect(areVisitorIdAndRequestIdValid(visitorId, requestId)).toStrictEqual(true)
  }

  async function runTest(page: Page, url: string) {
    console.log(`Running goto url: ${url}...`)
    await page.goto(url, {
      waitUntil: 'networkidle',
    })

    await wait(5000)
    await page.waitForSelector('#result > code').then(testForElement)
    await page.waitForSelector('#cdn-result > code').then(testForElement)
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

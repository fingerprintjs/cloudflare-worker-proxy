import { describe, test, expect, beforeEach } from 'vitest'
import { createErrorResponseForIngress, createFallbackErrorResponse } from '../../src/utils'
import { FPJSResponse } from '../../src/utils'

describe('createErrorResponseForIngress', () => {
  let response: Response
  beforeEach(() => {
    const req = new Request('https://example.com', { headers: { origin: 'https://some-website.com' } })
    const errorReason = 'some error message'
    response = createErrorResponseForIngress(req, errorReason)
  })
  test('response body is as expected', async () => {
    expect(response.body).not.toBeNull()
    if (response.body === null) {
      return
    }
    const bodyReader = response.body.getReader()
    await bodyReader.read().then((body) => {
      if (body.value === undefined) {
        return
      }
      const bodyString = Array.from<number>(body.value)
        .map((el) => String.fromCharCode(el))
        .join('')
      const errorData: FPJSResponse = JSON.parse(bodyString)
      expect(errorData.v).toBe('2')
      expect(errorData.error).not.toBeNull()
      expect(errorData.error?.code).toBe('IntegrationFailed')
      expect(errorData.error?.message).toBe(`An error occurred with Cloudflare worker. Reason: some error message`)
      expect(errorData.requestId).toMatch(/^\d{13}\.[a-zA-Z\d]{6}$/)
      expect(errorData.products).toStrictEqual({})
    })
  })
  test('response headers are as expected', () => {
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://some-website.com')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
  test('response status is as expected', () => {
    expect(response.status).toBe(500)
  })
  test('response headers are as expected when origin is not found', () => {
    const reqWithNoOrigin = new Request('https://example.com')
    const errorReason = 'some error'
    const response = createErrorResponseForIngress(reqWithNoOrigin, errorReason)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('')
  })
  test('handles error type error messages correctly', async () => {
    const reqWithNoOrigin = new Request('https://example.com')
    const errorReason = new Error('some error message')
    const response = createErrorResponseForIngress(reqWithNoOrigin, errorReason)
    if (response.body === null) {
      return
    }
    const bodyReader = response.body.getReader()
    await bodyReader.read().then((body) => {
      if (body.value === undefined) {
        return
      }
      const bodyString = Array.from<number>(body.value)
        .map((el) => String.fromCharCode(el))
        .join('')
      const errorData: FPJSResponse = JSON.parse(bodyString)
      expect(errorData.error).not.toBeNull()
      expect(errorData.error?.code).toBe('IntegrationFailed')
      expect(errorData.error?.message).toBe('An error occurred with Cloudflare worker. Reason: some error message')
    })
  })
  test('handles unknown type error messages correctly', async () => {
    const reqWithNoOrigin = new Request('https://example.com')
    const errorReason = { toString: null }
    const response = createErrorResponseForIngress(reqWithNoOrigin, errorReason)
    if (response.body === null) {
      return
    }
    const bodyReader = response.body.getReader()
    await bodyReader.read().then((body) => {
      if (body.value === undefined) {
        return
      }
      const bodyString = Array.from<number>(body.value)
        .map((el) => String.fromCharCode(el))
        .join('')
      const errorData: FPJSResponse = JSON.parse(bodyString)
      expect(errorData.error).not.toBeNull()
      expect(errorData.error?.code).toBe('IntegrationFailed')
      expect(errorData.error?.message).toBe('An error occurred with Cloudflare worker. Reason: unknown')
    })
  })
})

describe('createFallbackErrorResponse', () => {
  let response: Response
  beforeEach(() => {
    const errorReason = 'some error message'
    response = createFallbackErrorResponse(errorReason)
  })
  test('response body is as expected', async () => {
    expect(response.body).not.toBeNull()
    if (response.body === null) {
      return
    }
    const bodyReader = response.body.getReader()
    await bodyReader.read().then((body) => {
      if (body.value === undefined) {
        return
      }
      const bodyString = Array.from<number>(body.value)
        .map((el) => String.fromCharCode(el))
        .join('')
      const errorData: { error: string } = JSON.parse(bodyString)
      expect(errorData.error).toBe('some error message')
    })
  })
  test('response status is as expected', () => {
    expect(response.status).toBe(500)
  })
})

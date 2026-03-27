import { describe, it, test, expect, beforeEach } from 'vitest'
import { addProxyIntegrationHeaders, getIPFromHeaders } from '../../src/utils'
import { WorkerEnv } from '../../src/env'

const ipv6 = '84D:1111:222:3333:4444:5555:6:77'
const ipv4 = '19.117.63.126'

describe('addProxyIntegrationHeaders', () => {
  let headers: Headers
  let env: WorkerEnv

  beforeEach(() => {
    headers = new Headers()
    headers.set('CF-Connecting-IP', ipv4)
    headers.set('x-custom-header', 'custom-value')
    env = {
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent-path',
      GET_RESULT_PATH: 'result-path',
      PROXY_SECRET: 'secret_value',
      FPJS_INGRESS_BASE_HOST: null,
      INTEGRATION_PATH_DEPTH: 1,
    }
  })

  it('append proxy headers when PROXY_SECRET is set', () => {
    addProxyIntegrationHeaders(headers, 'https://example.com/worker/result', env)
    expect(headers.get('FPJS-Proxy-Secret')).toBe('secret_value')
    expect(headers.get('FPJS-Proxy-Client-IP')).toBe(ipv4)
    expect(headers.get('FPJS-Proxy-Forwarded-Host')).toBe('example.com')
    expect(headers.get('x-custom-header')).toBe('custom-value')
  })

  test('even if proxy secret is null, other FPJS-Proxy-* headers are still added to the proxied request headers. Original headers are preserved.', () => {
    env.PROXY_SECRET = null
    addProxyIntegrationHeaders(headers, 'https://example.com/worker/result', env)
    expect(headers.get('FPJS-Proxy-Secret')).toBe(null)
    expect(headers.get('FPJS-Proxy-Client-IP')).toBe(ipv4)
    expect(headers.get('FPJS-Proxy-Forwarded-Host')).toBe('example.com')
    expect(headers.get('x-custom-header')).toBe('custom-value')
  })

  test('use ipv6 when connecting ip is ipv6', () => {
    headers.set('CF-Connecting-IP', ipv6)
    addProxyIntegrationHeaders(headers, 'https://example.com/worker/result', env)
    expect(headers.get('FPJS-Proxy-Secret')).toBe('secret_value')
    expect(headers.get('FPJS-Proxy-Client-IP')).toBe(ipv6)
    expect(headers.get('FPJS-Proxy-Forwarded-Host')).toBe('example.com')
    expect(headers.get('x-custom-header')).toBe('custom-value')
  })

  test('use CF-Connecting-IP as FPJS-Proxy-Client-IP when Cf-Pseudo-IPv4 is present but different', () => {
    headers.set('CF-Connecting-IP', ipv6)
    headers.set('Cf-Pseudo-IPv4', ipv4)
    addProxyIntegrationHeaders(headers, 'https://example.com/worker/result', env)
    expect(headers.get('FPJS-Proxy-Client-IP')).toBe(ipv6)
  })

  test('use CF-Connecting-IPv6 as FPJS-Proxy-Client-IP when Cf-Pseudo-IPv4 matches CF-Connecting-IP', () => {
    headers.set('CF-Connecting-IP', ipv4)
    headers.set('Cf-Pseudo-IPv4', ipv4)
    headers.set('CF-Connecting-IPv6', ipv6)
    addProxyIntegrationHeaders(headers, 'https://example.com/worker/result', env)
    expect(headers.get('FPJS-Proxy-Client-IP')).toBe(ipv6)
  })
})

describe('getIPFromHeaders', () => {
  it('returns CF-Connecting-IP when only CF-Connecting-IP is set', () => {
    const headers = new Headers()
    headers.set('CF-Connecting-IP', ipv4)

    expect(getIPFromHeaders(headers)).toEqual(ipv4)
  })

  it('returns CF-Connecting-IP when Cf-Pseudo-IPv4 is present but different', () => {
    const headers = new Headers()
    headers.set('CF-Connecting-IP', ipv6)
    headers.set('Cf-Pseudo-IPv4', ipv4)

    expect(getIPFromHeaders(headers)).toEqual(ipv6)
  })

  it('returns CF-Connecting-IPv6 when Cf-Pseudo-IPv4 matches CF-Connecting-IP', () => {
    const headers = new Headers()
    headers.set('CF-Connecting-IP', ipv4)
    headers.set('Cf-Pseudo-IPv4', ipv4)
    headers.set('CF-Connecting-IPv6', ipv6)

    expect(getIPFromHeaders(headers)).toEqual(ipv6)
  })

  it('returns an empty string when CF-Connecting-IP header is set to an empty string', () => {
    const headers = new Headers()
    headers.set('CF-Connecting-IP', '')

    expect(getIPFromHeaders(headers)).toEqual('')
  })

  it('returns an empty string when no headers are set', () => {
    expect(getIPFromHeaders(new Headers())).toEqual('')
  })
})

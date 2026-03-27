import { describe, test, expect } from 'vitest'
import { getAgentScriptEndpoint, getIngressEndpoint } from '../../src/utils'
import { config } from '../../src/config'

describe('getAgentScriptEndpoint', () => {
  const f = getAgentScriptEndpoint
  const apiKey = 'randomlyGeneratedApiKey'

  test('apiKey exists, version does not exist', () => {
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('apiKey', apiKey)
    expect(f(config.fpcdn, urlSearchParams)).toBe(`https://${config.fpcdn}/web/v3/${apiKey}`)
  })
  test('apiKey exists, version exists', () => {
    const version = '4'
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('apiKey', apiKey)
    urlSearchParams.set('version', version)
    expect(f(config.fpcdn, urlSearchParams)).toBe(`https://${config.fpcdn}/web/v${version}/${apiKey}`)
  })
  test('apiKey exists, version does not exist, loaderVersion exists', () => {
    const loaderVersion = '3.7.0'
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('apiKey', apiKey)
    urlSearchParams.set('loaderVersion', loaderVersion)
    expect(f(config.fpcdn, urlSearchParams)).toBe(
      `https://${config.fpcdn}/web/v3/${apiKey}/loader_v${loaderVersion}.js`
    )
  })
  test('apiKey exists, version exists, loaderVersion exists', () => {
    const version = '4'
    const loaderVersion = '3.7.0'
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('apiKey', apiKey)
    urlSearchParams.set('version', version)
    urlSearchParams.set('loaderVersion', loaderVersion)
    expect(f(config.fpcdn, urlSearchParams)).toBe(
      `https://${config.fpcdn}/web/v${version}/${apiKey}/loader_v${loaderVersion}.js`
    )
  })
})

describe('getIngressEndpoint', () => {
  test('no region', () => {
    const urlSearchParams = new URLSearchParams()
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, '/')).toBe(`https://${config.ingressApi}/`)
  })
  test('us region', () => {
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('region', 'us')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, '/')).toBe(`https://${config.ingressApi}/`)
  })
  test('eu region', () => {
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('region', 'eu')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, '/')).toBe(`https://eu.${config.ingressApi}/`)
  })
  test('ap region', () => {
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('region', 'ap')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, '/')).toBe(`https://ap.${config.ingressApi}/`)
  })
  test('invalid region', () => {
    const urlSearchParams = new URLSearchParams()
    urlSearchParams.set('region', 'foo.bar/baz')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, '/')).toBe(`https://${config.ingressApi}/`)
  })
  test('no region with suffix', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = '/suffix/more/path'
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)).toBe(
      `https://${config.ingressApi}/suffix/more/path`
    )
  })
  test('us region with suffix', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = '/suffix/more/path'
    urlSearchParams.set('region', 'us')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)).toBe(
      `https://${config.ingressApi}/suffix/more/path`
    )
  })
  test('eu region with suffix', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = '/suffix/more/path'
    urlSearchParams.set('region', 'eu')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)).toBe(
      `https://eu.${config.ingressApi}/suffix/more/path`
    )
  })
  test('ap region with suffix', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = '/suffix/more/path'
    urlSearchParams.set('region', 'ap')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)).toBe(
      `https://ap.${config.ingressApi}/suffix/more/path`
    )
  })
  test('invalid region with suffix', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = '/suffix/more/path'
    urlSearchParams.set('region', 'foo.bar/baz')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)).toBe(
      `https://${config.ingressApi}/suffix/more/path`
    )
  })
  test('ap region with suffix with dot', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = '/.suffix/more/path'
    urlSearchParams.set('region', 'ap')
    expect(getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)).toBe(
      `https://ap.${config.ingressApi}/.suffix/more/path`
    )
  })
  test('invalid suffix', () => {
    const urlSearchParams = new URLSearchParams()
    const pathName = 'suffix/more/path'
    urlSearchParams.set('region', 'ap')
    expect(() => {
      getIngressEndpoint(config.ingressApi, urlSearchParams, pathName)
    }).toThrow()
  })
})

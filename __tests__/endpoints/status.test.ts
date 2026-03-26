import { describe, test, expect, beforeEach } from 'vitest'
import worker from '../../src'
import { config } from '../../src/config'
import { WorkerEnv } from '../../src/env'

describe('status page content', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: () => new Uint8Array(24),
      },
    })
  })
  test('when all variables are set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download',
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(await response.text()).toMatchSnapshot()
  })
  test('when proxy secret is not set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: null,
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download',
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(await response.text()).toMatchSnapshot()
  })
  test('when get result path is not set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: null,
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download',
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(await response.text()).toMatchSnapshot()
  })
  test('when agent script download path is not set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: null,
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(await response.text()).toMatchSnapshot()
  })
  test('when agent script download path and proxy secret are not set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: null,
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: null,
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(await response.text()).toMatchSnapshot()
  })
  test('when integration path depth is invalid', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent',
      INTEGRATION_PATH_DEPTH: 0,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(await response.text()).toMatchSnapshot()
  })
  test('when integration path depth is not set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent',
      INTEGRATION_PATH_DEPTH: null,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    const body = await response.text()
    expect(body).toMatchSnapshot()
  })
})

describe('status page response headers', () => {
  test('CSP is set', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download',
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status')
    const response = await worker.fetch(req, workerEnv)
    expect(response.headers.get('content-security-policy')).toMatch(
      /^default-src 'none'; img-src https:\/\/fingerprint\.com; style-src 'nonce-[\w=]+'$/
    )
  })
})

describe('status page other HTTP methods than GET', () => {
  test('returns 405 when method is POST', async () => {
    const workerEnv: WorkerEnv = {
      FPJS_INGRESS_BASE_HOST: config.ingressApi,
      PROXY_SECRET: 'proxy_secret',
      GET_RESULT_PATH: 'get_result',
      AGENT_SCRIPT_DOWNLOAD_PATH: 'agent_download',
      INTEGRATION_PATH_DEPTH: 1,
    }
    const req = new Request('http://localhost/worker_path/status', { method: 'POST' })
    const response = await worker.fetch(req, workerEnv)
    expect(response.status).toBe(405)
  })
})

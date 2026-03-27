# Contributing to FingerprintJS Cloudflare Worker

## Requirements

- Node 24 (for development; the published package supports Node >=16 as specified in `package.json`)
- Typescript 4+
- Playwright
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) v4+

## Working with code

We prefer using [pnpm](https://pnpm.io/) for installing dependencies and running scripts. `pnpm` version 9.x is required. If you have `corepack` installed, the exact version of `pnpm` used by this repository can be installed with `corepack install`.

The `main` is locked for the push action. 

`main` branch is always where we create releases.

For proposing changes, use the standard [pull request approach](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request). It's recommended to discuss fixes or new functionality in the Issues, first.

Create pull requests for the `main` branch.

### How to build
After cloning the repo, run `pnpm install` to install packages.

Run `pnpm build` for creating a build in `dist` folder. The build creates the worker script file, located at `dist/fingerprint_proxy_local_development/index.js`.

### How to run locally

Running `pnpm install` will install [Wrangler](https://developers.cloudflare.com/workers/wrangler/) from Cloudflare locally.

After running `pnpm install`, you can run `pnpm dev` to run the worker locally. The local worker will be available at `http://localhost:5173`.

By default, the worker will use an `INTEGRATION_PATH_DEPTH=1` and an unset `AGENT_SCRIPT_DOWNLOAD_PATH` and `GET_RESULT_PATH`
resulting in all routes nested under an arbitrary, single path segment.

The available routes are:
- `/INTEGRATION_PATH/web/v4/API_KEY` for downloading the Fingerprint agent script (a.k.a `import` url)
- `/INTEGRATION_PATH` for getting the result (a.k.a. `endpoints`)
- `/INTEGRATION_PATH/status` for getting the status page

where `INTEGRATION_PATH` is a placeholder for any valid path segment.

You can use the worker locally with a client like the example below:
```html
<script>
  // REPLACE API_KEY, INTEGRATION_PATH
  const fpPromise = import('http://localhost:5173/INTEGRATION_PATH/web/v4/API_KEY') 
    .then((Fingerprint) => Fingerprint.start({
      endpoints: 'http://localhost:5173/INTEGRATION_PATH'
    }))

  // Get the visitor identifier when you need it.
  fpPromise
    .then(fp => fp.get())
    .then(result => {
      // This is the visitor identifier:
      const visitorId = result.visitor_id
      console.log(visitorId)
    })
</script>
```

### Code style

The code style is controlled by [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). Run to check that the code style is ok:
```shell
pnpm lint
```

You aren't required to run the check manually, the CI will do it. Run the following command to fix style issues (not all issues can be fixed automatically):
```shell
pnpm lint:fix
```

### Commit style

You are required to follow [conventional commits](https://www.conventionalcommits.org) rules.

### How to test

#### Unit tests

Run `pnpm test`.

#### e2e tests

End-to-end tests are run automatically on every PR. They also run daily on the `main` branch.

End-to-end tests are located in the `e2e` folder and run by [playwright](https://github.com/microsoft/playwright) environment. 
The `teste2e.yml` workflow is responsible for deploying a new Cloudflare worker, running end-to-end tests, and cleaning up the worker in the end. `teste2e.yml` works like this:
1. Check out the current branch (can be any branch).
2. Bump version according to the input, default to `patch`.
3. Generate environment variables, such as `WORKER_NAME` and `GET_RESULT_PATH`. Put them inside `wranger.toml`.
4. Publish the worker using `cloudfare/wrangler-action` to the designated Cloudflare account.
5. Install `playwright`.
6. Run `pnpm test:e2e` with env variables `test_client_domain`, `worker_version`, `worker_path`, `get_result_path`, and `agent_download_path`.
7. Delete the published Cloudflare worker from the Cloudflare account.

If tests fail, the last step (cleaning up the worker) is never executed by design, so that there is opportunity to inspect the worker to understand what went wrong.
Do not forget to delete the worker manually after using the Cloudflare dashboard. You can find the name of the worker in the workflow logs.

If the required environment variables are supplied, `pnpm test:e2e` can be run locally without needing `teste2e.yml`. For example, the command `worker_version=1.2.3 pnpm test:e2e` sets `worker_version` as a temporary env variable on *nix systems.

#### Proxy integration validation tests

The `teste2e.yml` workflow also includes a job to run the test suite from [fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests](https://github.com/fingerprintjs/dx-team-mock-for-proxy-integrations-e2e-tests) against a deployed Cloudflare worker.

The job runs the test suite twice: once with the default compatibility date for the Cloudflare worker runtime and once with the current date (the latest compatibility date).
See the [Cloudflare documentation for compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) for more information.


### How to release a new version

The workflow `release.yml` is responsible for releasing a new version. Run it on the `main` branch.

### How to keep your worker up-to-date

The [Fingerprint Cloudflare Proxy Integration](https://docs.fingerprint.com/docs/cloudflare-integration) always uses the latest stable version of this worker, and upgrades customer workers automatically.

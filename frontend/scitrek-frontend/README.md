# SciTrek frontend

The frontend is a React 18 application built with Vite. Use Node 20.19.5 or
newer and install the exact dependency graph from the committed lockfile:

```bash
npm ci
```

## Local development

```bash
npm run dev
```

The development server listens on `http://127.0.0.1:3000` and proxies `/api`,
`/healthz`, and `/readyz` to `http://127.0.0.1:8000` by default. Copy
`.env.example` to an untracked local environment file only when the defaults do
not fit your setup.

Browser API calls are same-origin by default. `VITE_API_BASE_URL` is optional;
when set, it must contain only an origin/base URL and must not end in `/api`
because application endpoints already include that prefix.

## Verification

```bash
npm test
npm run coverage
npm run build
npm run verify-sitemap
npm run e2e:mocked
```

The production bundle is emitted to `dist/`. The mocked browser suite is useful
for fast UI checks. The backend-connected suite has separate infrastructure and
runs with:

```bash
npm run e2e:fullstack
```

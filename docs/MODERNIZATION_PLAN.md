# SciTrek production-readiness ledger

Priorities: P0 is a release blocker, exploitable security issue, or data-loss
risk; P1 blocks reliable, reproducible operation; P2/P3 are follow-up work.
Verification is recorded only for commands executed in this working tree.

## Findings and disposition

| ID | Priority | Finding | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| SEC-001 | P0 | Environment files and runtime artifacts remain in Git history. | **Owner-blocked.** Current-tree files are deleted/ignored/guarded; rotate all historical credentials and perform the coordinated history rewrite before release. | Filename-only history scan; `scripts/check-tracked-runtime-artifacts.sh`; owner runbook |
| SEC-002 | P0 | A teacher could transfer a known student from another classroom and read historical work. | **Implemented.** Cross-classroom moves are rejected under a lock; new attempts retain classroom context; unrecoverable legacy attempts remain unassigned/hidden; reports/details are scoped. | Adversarial regressions; migration inspection; compilation |
| SEC-003 | P0 | Quiz scores were accepted from the client. | **Implemented.** Exact answer maps are validated and scored server-side; score is read-only. | Forge/missing/unknown/choice regressions |
| SEC-004 | P0 | Teachers could mutate/delete global curriculum and teacher-written HTML could execute in student sessions. | **Implemented.** Global writes require staff/explicit model permissions; destructive regressions retain answers; conservative input/output sanitization and CSP are applied. | Review regressions; production nginx config test; compilation |
| OPS-001 | P0 | Web uploads were ephemeral/invisible to Celery, while active media URLs were unsafe or broken. | **Implemented.** Private persistent media is shared by web/worker; nginx rejects `/media/`; scoped Django downloads apply private/no-store, attachment/safe-image handling, and `nosniff`. | Isolated volume probe; API regressions added; frontend authenticated-image tests |
| FE-001 | P0 | Clean production builds fell back to browser-local HTTP and env naming was inconsistent. | **Implemented.** Same-origin default, guarded `VITE_API_BASE_URL`, excluded env inputs, Vite build. | Production image build; bundle scan; API config tests |
| OPS-002 | P1 | Web startup migrated/seeded implicitly and production infrastructure lacked deterministic readiness. | **Implemented.** Bounded DB wait, one-shot migration/static collection, PostgreSQL+Redis readiness, restart/health policies. | PostgreSQL E2E stack; Compose validation |
| OPS-003 | P1 | TLS required nonexistent certificates and Certbot never renewed. | **Implemented locally.** Short-lived self-signed bootstrap, explicit first issuance, renewal loop, reload watcher. Real issuance remains deployment/DNS work. | Fresh empty-volume bootstrap and `nginx -t` |
| TEST-001 | P1 | All browser tests mocked Django. | **Implemented.** Separate guarded PostgreSQL stack plus persistence, cross-role, and axe scenarios. | 5/5 full-stack Playwright; 12/12 mocked Playwright |
| FE-002 | P1 | CRA carried a large deprecated/advisory surface. | **Implemented.** Migrated to Vite/Vitest and bundled runtime assets. | 70/70 tests; coverage gate; build; lock/audit |
| AUTH-001 | P1 | Weak signup passwords and per-process/unscoped throttles. | **Implemented.** Django password validation, atomic creation, Redis cache, trusted proxy count, endpoint-specific throttles. | Focused auth/throttle regressions; production settings check |
| CONTENT-001 | P1 | Students could access unreleased module and quiz content. | **Implemented.** Read and submit paths enforce assignments and release dates. | Boundary-time and denial regressions |
| CI-001 | P1 | CI lacked PostgreSQL/Redis, coverage floors, full-stack/a11y, production builds, and failure artifacts. | **Implemented.** Jobs are separated and locked examples are used for clean Compose checks. | Workflow parse; local-equivalent matrix |
| OPS-004 | P1 | No backup/restore, smoke, or current deployment procedure. | **Implemented.** Guarded scripts and runbooks. | Backup plus restore into disposable DB with matching aggregate counts; script syntax/guards |
| SEC-005 | P0 | Migration 0007 would expose legacy attempts to a student's current classroom after transfer. | **Implemented.** Historical provenance is not guessed; legacy attempts stay `NULL` and are excluded from reporting. | Fresh adversarial review; migration inspection; regression added |
| OPS-005 | P1 | Scheduled-message broker failure returned false success; attachments were not delivered. | **Implemented.** Queue failure returns 503 and rolls back the record/file; delivery reuses the protected storage reference; Celery durability is explicit. | Failure/attachment regressions added; compilation |
| OPS-006 | P1 | Workbook re-import could destroy last-good content on a partial failure. | **Implemented.** Row-serialized, atomic replacement with rollback and durable error state. | Failure regression added; compilation |
| AUTH-002 | P1 | Public guest/signup enrollment used caller-selected, guessable classrooms. | **Implemented safe default.** Guests are off and demo-scoped; public signup is off in production pending an approved join policy. | Secure-default regressions added; config inspection |
| NGINX-CI-001 | P1 | The fresh-volume TLS/nginx gate never actually passed: `docker compose run --no-deps nginx nginx -t` cannot resolve the `web` upstream, so the config test failed. The earlier reading was masked by piping the command into `tail`. | **Fixed during release qualification.** The gate now runs the built image directly with the upstream name stubbed for resolution only and an empty `/etc/letsencrypt` volume, so it still exercises the real entrypoint bootstrap, templating, and `nginx -t`. Production Compose and the nginx config are unchanged. | `nginx -t` now exits 0 with the bootstrap certificate created on an empty volume; CI YAML parses |
| HYG-001 | P2 | 53 compiled `__pycache__/*.pyc` files were tracked in Git, and the artifact guard did not reject compiled bytecode, so running any Python locally rewrote tracked files. | **Fixed during release qualification.** The bytecode is untracked (files remain on disk, already covered by `.gitignore`) and the guard now rejects `__pycache__/` and `*.pyc`/`*.pyo`. | Guard reproduces the failure on all 53 paths before the change and exits 0 after; no tracked `.pyc` remains |
| SEC-006 | P2 | `require_secret_env` accepted 40-character secrets, below the 50-character floor Django's own `security.W009` deploy check warns about, so `check --deploy` emitted a warning inside a release gate. | **Fixed during release qualification.** The floor is 50 characters and the deploy-check key in CI was lengthened. | Regression test added (46-character key rejected); 184-test suite green; `check --deploy` now reports no issues and no warnings |

| RENDER-001 | P1 | The deployment assumed an nginx edge and a shared media volume, neither of which exists on a platform that routes straight to Django. CSP and Permissions-Policy would have disappeared, health checks would have been answered with a 301, the image could not bind a runtime-assigned port, and the worker could not read an upload the web service saved. | **Implemented ahead of the Render deploy.** `SecurityHeadersMiddleware` emits both policies when `SECURITY_HEADERS_FROM_APP` says the application owns them; `SECURE_REDIRECT_EXEMPT` covers the four health endpoints; `start-web.sh` binds `$PORT`; media reads go through the storage API with `MEDIA_STORAGE_BACKEND=s3` available. All four default to the existing Compose behaviour. | Live header/redirect/port checks; volumeless web-to-worker S3 probe; 198 tests green on both media backends at 87.2% |

## Decision record

| Decision | Result | Why |
| --- | --- | --- |
| Build tool | Vite/Vitest | Preserved behavior and coverage while reducing the lock from 1,472 to 456 package entries and advisories from 30 to 2 moderate. |
| Edge proxy | Keep nginx | Existing topology retained; explicit TLS bootstrap/renewal, proxy trust, upload limit, CSP, cache, compression, and health behavior close the demonstrated gaps. |
| Production database | Managed PostgreSQL | Keeps backup/PITR ownership with the database provider; disposable PostgreSQL remains in dev/CI/E2E. |
| Migrations | One-shot service | Prevents concurrent/rerun migration and seed behavior on ordinary web restarts. |
| Media | Host-local private volume by default; S3-compatible object storage selectable | Fixes single-host durability and worker access without exposing student files publicly. Object storage is not optional on a platform whose disks cannot be shared between services, so the backend is now a configuration choice rather than future work. |
| Celery | Keep worker; remove beat | Workbook parsing needs a worker; no required periodic task justified a beat process. |
| Browser testing | Retain fast mocked suite and add distinct real suite | Mocks give fast UI feedback; only PostgreSQL-backed browser tests count as persistence evidence. |
| Coverage | Backend 85% branch-aware; frontend explicit four-metric floors | Preserves regression protection without padding low-value tests. Backend application result is 87.2%. |
| Router advisories | Do not force Router 7 during release hardening | Remaining two advisories are moderate, current exposure is constrained, and npm offers only a semver-major change requiring its own regression cycle. |
| Historical secrets | Release blocked pending owner attestation | Current-tree deletion cannot invalidate leaked credentials or remove Git objects. |

## Deferred P2/P3 work

- private object storage/signed URLs before multi-host scale;
- Secure HttpOnly refresh-cookie migration with token rotation/blacklisting;
- opaque classroom join codes or teacher-approved enrollment before enabling
  production public signup;
- structured request correlation, metrics, and an external error-monitoring owner;
- route-level frontend code splitting for the current 798 kB minified bundle;
- React Router 7 migration with route/auth regression coverage;
- resource limits, read-only filesystems, and dropped Linux capabilities after
  production workload profiling.

# SciTrek production-readiness test audit

Branch: `andyDeployedPre`  
Verified: 2026-08-14

## Before and after

| Gate | Verified starting point | Current evidence |
| --- | ---: | ---: |
| Django tests | 137 | **184 collected, 184 passed** against PostgreSQL on the current tree (release-qualification run) |
| Backend coverage | about 85% branch-aware | **87.1% branch-aware** on the current tree; 85% gate passed |
| Frontend tests | 64 Jest/RTL | **70 passed** in Vitest |
| Frontend coverage | 57.76% statements / 46.05% branches / 45.85% functions / 58.82% lines | **58.84% / 49.86% / 46.07% / 60.09%**, floors 57/46/45/58 |
| Mocked Playwright | 12 | **12 passed** across desktop/mobile Chromium at the browser milestone |
| Real backend E2E | 0 | **5 passed** against Django/PostgreSQL/Redis at the browser milestone |
| Accessibility | none | **2 full-stack axe cases passed**, covering login and core authenticated pages; keyboard/focus component regressions also pass |
| npm advisories | 30: 14 high, 7 moderate, 9 low | **2 moderate; 0 high/critical** |
| Python advisories | none | **none** |

The post-adversarial-review verification gap is now closed. The current tree was
executed end to end in one release-qualification pass: 184 backend tests against
PostgreSQL and Redis, 70 frontend tests, 12 mocked browser cases, and 5
full-stack browser cases — 271 executed cases in total. Backend counts are
Django's own collection number, not a source inventory.

The real browser suite covers login and authenticated-page accessibility,
student answer save/reload persistence, inbox read persistence, a teacher
observing student work, and a student being denied teacher reporting.

## Verification record

| Check | Result |
| --- | --- |
| `coverage run manage.py test` in the isolated PostgreSQL/Redis E2E container | **184 collected, 184 passed** in 114.566s on the current tree |
| `coverage report` with `.coveragerc` | **87.1%** branch-aware; 85% gate passed (exit 0) on the current tree |
| post-review backend rerun | **Executed and green.** The suite was rebuilt from the final post-adversarial-review sources and run against PostgreSQL 16 and Redis 7 |
| `npm run coverage` | **70 passed**; 58.84/49.86/46.07/60.09 and all four floors passed |
| `npm run build` | **Passed**; Vite produced the production bundle and 15-route sitemap |
| `npm run verify-sitemap` | **Passed**, 15/15 static routes |
| `npm ls --all` | **Passed**; only expected optional peer/platform entries are absent |
| `npm run e2e:mocked` | **12 passed** on the current tree (desktop and mobile Chromium) |
| `npm run e2e:fullstack` | **5 passed** on the current tree against a freshly rebuilt PostgreSQL/Redis/Gunicorn stack, including 2 axe cases |
| production nginx/Vite Docker build | **Passed** on the current tree (`docker compose build web nginx`) |
| fresh empty-volume TLS bootstrap plus `nginx -t` | **Passed** on the current tree after fixing the gate itself; see NGINX-CI-001 in the ledger. The earlier "passed" reading was masked by a shell pipe and the real config test was failing on upstream name resolution |
| production, development, and E2E `docker compose config --quiet` | **Passed after final review** with example env files |
| `pip-audit==2.10.1 -r requirements.txt` | **No known vulnerabilities** at dependency milestone |
| `npm audit --json` | **2 moderate** React Router findings; 0 high/critical |
| database backup and restore | **Passed:** disposable restore matched users=4, classrooms=1, responses=0, messages=12 |
| media backup/restore | **Drill executed** in an isolated Compose project: seeded media archived, volume emptied, restored byte-identical with `scitrek:scitrek` ownership. Both refusal guards (missing confirmation, non-empty target) also fired |
| isolated web-to-worker media volume probe | **Passed** on the current tree (web wrote, worker read the same bytes) |
| migration drift and production deploy checks | **Passed on the current tree.** `makemigrations --check --dry-run` reports no changes; `check --deploy` reports no issues and no warnings |
| shell syntax, workflow YAML, Python compilation, artifact guard, Compose config, `git diff --check` | **Passed after final review** |

## Release status

Every code-side release gate has now been executed against the current tree and
is green, including the previously outstanding 184-test PostgreSQL suite, the
Celery-worker and shared-media runtime gates, the nginx/TLS bootstrap gate, and
the media restore drill.

Release is still not approved. Owner credential rotation and Git-history
remediation remain a P0 blocker, and one clean GitHub Actions run from the
committed SHA is required as release truth. Real ACME issuance/renewal on the
production domain, managed-PostgreSQL recovery controls, and the external-domain
smoke test remain target-environment work.

# Security model and release controls

## Trust boundaries

- nginx replaces client-supplied forwarding headers and Django trusts exactly
  one proxy hop in production.
- Redis-backed throttles are shared across Gunicorn workers. Login, refresh,
  signup, and guest creation use distinct rates.
- Guest creation and public signup are disabled by production-safe defaults.
  Guest access can target only the configured demo classroom. Do not enable
  public signup until the deployment has an approved opaque join-code or
  teacher-approval enrollment policy.
- Teachers may access only classrooms they own. Adding a roster member cannot
  transfer a student from another classroom.
- Quiz scores are calculated from a complete validated answer map on the
  server. The client cannot persist a score.
- Teacher reporting scopes attempts to the immutable classroom recorded on the
  attempt. Legacy attempts with unrecoverable enrollment are hidden pending
  data-owner reconciliation.
- Shared workbook HTML writes require staff or the Django `change_section`
  permission and HTML is sanitized on input and output. nginx adds a restrictive
  CSP, clickjacking, MIME-sniffing, referrer, and permissions policies.
- Module and quiz reads/submissions require a released classroom assignment.

## Secrets and private data

Real `.env` files, keys, database/runtime files, media, static output, coverage,
and browser artifacts are ignored and rejected if tracked. Example files
contain placeholders only. Do not put student data in logs, fixtures, or smoke
accounts.

Historical environment and runtime files still exist in Git history. A public
release remains blocked until the repository owner rotates/invalidate every
historical credential, completes the coordinated history rewrite, force-pushes,
requires fresh clones, and records a clean secret scan. Follow
[HISTORICAL_SECRETS_REMEDIATION.md](HISTORICAL_SECRETS_REMEDIATION.md).

Uploaded media is shared privately between web and worker and survives
container recreation. nginx deliberately returns 404 for direct `/media/`;
authorization-scoped Django endpoints force downloads or safe inline image
types with private/no-store and `nosniff` headers. Upload validation checks
extension, declared MIME, magic bytes where applicable, and size, while nginx
applies an 11 MiB request ceiling.

Access and refresh JWTs remain in browser storage. The restrictive CSP,
bundled assets, HTML sanitization, and curriculum-write controls materially
reduce script injection risk, but a future authentication redesign should put
the refresh credential in a Secure, HttpOnly, SameSite cookie with CSRF and
rotation/blacklist coverage.

## Residual dependency risk

The current frontend lock has no high or critical npm advisories. Two moderate
React Router 6 advisories remain; npm offers only a semver-major Router 7 fix.
The current SPA does not use SSR hydration or user-controlled navigation
targets. Upgrade and regression-test Router 7 as planned maintenance rather
than applying `npm audit fix --force`. Backend requirements currently have no
known findings under the pinned `pip-audit` CI check.

For incident response: preserve evidence, revoke affected credentials/tokens,
isolate the deployment, restore application and data together if integrity is
uncertain, and document scope and notification decisions. Database and media
recovery procedures are in [backup-restore.md](backup-restore.md).

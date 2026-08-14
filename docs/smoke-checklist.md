# Deployment smoke checklist

Run the non-destructive automated checks after every deployment:

```bash
scripts/smoke_test.sh https://sci-trek.org
```

It verifies the SPA, liveness, database readiness, API health, safe empty-login
behavior, and baseline security headers. `SMOKE_INSECURE_TLS=1` exists only for
testing the short-lived bootstrap path on an isolated host; never use it as
production acceptance.

Then verify manually with a dedicated smoke-test account:

1. Sign in and load the student profile and inbox.
2. Save one non-sensitive test answer and confirm it persists after refresh.
3. Upload a small test PDF, confirm the worker parses it, and remove the test
   object through the supported application flow.
4. Confirm the browser sends API traffic to the deployed origin, not localhost.
5. Confirm the certificate chain, expiry, and both configured DNS names.
6. Check `docker compose ps` and recent migrate/web/worker/nginx logs.

Do not use real student records for smoke testing.

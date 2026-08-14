# Historical Secrets Remediation — Owner Action Required

## Release status

**Production/public release is blocked until the repository owner completes
credential rotation and history remediation.** Removing files from the current
tree does not revoke their values or remove them from clones, forks, caches, or
Git history.

A filename-only scan on 2026-08-14 confirmed historical objects for:

- `backend/scitrek_backend/.env`
- `frontend/scitrek-frontend/.env`
- `frontend/scitrek-frontend/.env.production`
- `backend/scitrek_backend/dump.rdb`
- `backend/scitrek_backend/celerybeat-schedule.db`

No secret values were read into this document. Treat every credential that ever
appeared in those files as compromised, even if the repository was private.

## 1. Freeze and inventory

1. Temporarily freeze merges and ask collaborators not to push.
2. Record protected branches, tags, open pull requests, active forks, deployment
   keys, webhooks, and required status checks.
3. In the secret-management systems—not in tickets or chat—inventory every value
   that existed in the historical environment files. Include database users,
   Django signing keys, cloud/API credentials, SMTP credentials, Redis passwords,
   OAuth credentials, and deployment tokens where applicable.
4. Identify every environment that accepted each value: production, staging,
   CI, developer machines, backups, and third-party services.

## 2. Rotate and invalidate first

History rewriting is not revocation. Rotate credentials before publishing the
rewritten repository:

1. Create replacement credentials with least privilege in the owning provider.
2. Update the production/staging secret manager and CI repository/environment
   secrets using the provider UI or approved infrastructure workflow.
3. Redeploy and verify the application with the replacements.
4. Explicitly disable/delete the old credentials and terminate old sessions or
   tokens where the provider supports it.
5. Rotate `DJANGO_SECRET_KEY`; this invalidates Django-signed sessions/tokens, so
   schedule and communicate the expected logout window.
6. For database credentials, verify the old role/password can no longer connect.
7. Review provider audit logs from the first exposure date onward and escalate
   unexpected use through the incident-response process.

Do not paste either old or replacement values into Git commands, shell history,
issues, pull requests, or this repository.

## 3. Rewrite a disposable mirror

Use a clean mirror clone outside any developer working tree. The owner should
install and review the current `git-filter-repo` release, then run:

```bash
git clone --mirror <canonical-repository-url> scitrek-history-cleanup.git
cd scitrek-history-cleanup.git
git filter-repo --force --invert-paths \
  --path backend/scitrek_backend/.env \
  --path frontend/scitrek-frontend/.env \
  --path frontend/scitrek-frontend/.env.production \
  --path backend/scitrek_backend/dump.rdb \
  --path backend/scitrek_backend/celerybeat-schedule.db
```

If a reviewed secret scanner identifies credentials embedded in otherwise valid
source files, prepare a `--replace-text` rules file in a secured temporary
location. Never commit that rules file, and never copy matching secret values
into a shared log.

## 4. Verify before force-pushing

From the rewritten mirror:

```bash
git log --all --name-only --format= | sort -u | \
  grep -E '(^|/)(\.env($|\.)|dump\.rdb$|celerybeat-schedule\.db$)'
git fsck --full --no-reflogs
```

The first command must produce no forbidden paths except intentionally retained
`*.example` templates. Run an approved secret scanner across all refs and review
its findings without publishing detected values. Confirm branches and tags match
the pre-rewrite inventory.

## 5. Coordinate the force-push

1. Announce the maintenance window and exact cutoff commit.
2. Temporarily relax branch protection only as narrowly as required.
3. Force-push all rewritten branches and tags from the reviewed mirror.
4. Restore branch protection and required checks immediately.
5. Close or rebase open pull requests that point to the old graph.
6. Ask hosting support to purge cached pull-request refs/views if the provider
   requires a support process for sensitive-data removal.
7. Notify fork owners that their copies retain the old objects until they delete
   or independently rewrite them.

## 6. Require fresh clones

Every collaborator and deployment host must delete the obsolete clone and make a
fresh clone. Do not merge an old branch or pull from an old clone, because that
can reintroduce the removed objects. Invalidate CI caches/artifacts and deployment
bundles that may contain the old files. Apply the organization's backup retention
and secure-deletion policy to archived clones.

## 7. Close the release blocker

The owner may mark this blocker complete only after recording, in the private
incident/change system:

- credential inventory and rotation timestamps;
- proof old credentials were invalidated;
- secret-scan result for all rewritten refs;
- branch/tag verification;
- restored protection rules;
- collaborator/fork coordination;
- audit-log review outcome.

The repository-side prevention check is
`bash scripts/check-tracked-runtime-artifacts.sh`. It prevents common environment,
key, database, runtime-media, coverage, and build artifacts from being tracked,
but it is not a substitute for provider-side secret scanning or credential
rotation.

# Secrets and automated deploys (EC2)

Companion to [`ec2-bioinformatics-mod.md`](ec2-bioinformatics-mod.md). Covers two
opt-in pieces: pulling secrets from AWS Secrets Manager instead of the on-disk
`.env`, and redeploying on a push to the `production` branch.

Both are inert until configured. Local development, CI, and the Render path are
unchanged.

## AWS Secrets Manager

### How it works

`scitrek_backend/aws_secrets.py` exposes `load_into_environ()`, called as an early
line in `wsgi.py`, `asgi.py`, `celery.py`, and `manage.py` — before Django
settings import. If `AWS_SECRETS_MANAGER_SECRET_ID` is unset it returns
immediately. If set, it fetches that secret, expects a JSON object, and does
`os.environ.setdefault(key, value)` for each pair: **a value already in the
environment always wins**, and the call is idempotent.

A configured-but-broken secret store raises `RuntimeError` and the process does
not start — the same fail-fast contract as `require_env` in settings.

### The secret

One JSON secret, keys named exactly as the environment variables:

```json
{
  "DJANGO_SECRET_KEY": "<50+ random chars>",
  "DATABASE_PASSWORD": "<rds password>",
  "DATABASE_USER": "scitrek_admin",
  "DATABASE_NAME": "scitrek"
}
```

```bash
aws secretsmanager create-secret \
  --name scitrek/bioinformatics-mod/app \
  --secret-string file://secret.json \
  --region us-west-2
rm secret.json
```

Put only true secrets here. `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_SSLMODE`,
`TLS_DOMAIN`, and the feature flags stay in `.env` — they are not sensitive and
are easier to see and change there.

### `.env` on the box

```
AWS_SECRETS_MANAGER_SECRET_ID=scitrek/bioinformatics-mod/app
AWS_REGION=us-west-2
```

and **delete** `DJANGO_SECRET_KEY`, `DATABASE_PASSWORD`, `DATABASE_USER`,
`DATABASE_NAME` from `.env` — a leftover value there shadows the secret and, if
it is a placeholder, blocks startup.

### IAM

The EC2 **instance profile** role needs:

```json
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:us-west-2:<account>:secret:scitrek/bioinformatics-mod/app-*"
}
```

The default `aws/secretsmanager` KMS key needs no extra `kms:Decrypt` statement
in the same account. A customer-managed key does.

### IMDS hop limit

A Docker container is one network hop from the host, so boto3 inside the
container can only reach the instance metadata service (for the role
credentials) if the hop limit is 2:

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id <i-...> \
  --http-tokens required \
  --http-put-response-hop-limit 2
```

Set this at launch (Advanced details → Metadata) or with the command above.
Without it the app fails to start with a credentials error.

### Rotation

Container environment is read once at start. After rotating the secret:

```bash
cd /opt/scitrek/scitrek-bioinformatics
docker compose --env-file backend/scitrek_backend/.env up -d --force-recreate web worker
```

### Verifying

```bash
docker compose --env-file backend/scitrek_backend/.env \
  run --rm --entrypoint python web -c \
  "import os; from scitrek_backend import aws_secrets; aws_secrets.load_into_environ(); \
   print('DJANGO_SECRET_KEY' in os.environ, 'DATABASE_PASSWORD' in os.environ)"
```

`True True` means the fetch and merge worked.

## Automated deploy on push to `main`

Every merge to `main` deploys. There is no separate `production` branch;
`main`'s own branch protection (required PR review) is the go-live gate.

### Flow

```
push to main ──► .github/workflows/deploy.yml
                   job: ci   -> reuses .github/workflows/ci.yml (full suite)
                   job: deploy (needs ci)
                     assume AWS_DEPLOY_ROLE_ARN via GitHub OIDC
                     aws ssm send-command  ->  runs scripts/deploy.sh on the box
```

No inbound SSH: GitHub reaches the instance through SSM Send-Command, which is
IAM-gated and needs only the SSM agent (preinstalled on the Ubuntu AMI) and the
instance role's `AmazonSSMManagedInstanceCore` policy.

### `scripts/deploy.sh`

Idempotent and safe to run by hand, from SSM, or from a cron. On each run it:

1. `git fetch`; exits if the checkout already matches `origin/main`.
2. Diffs the changed paths.
   - only `docs/**`, `*.md`, `.github/**` → fast-forward the checkout, build nothing.
3. Rebuilds images by what changed:

   | Changed paths | Rebuild |
   | --- | --- |
   | `backend/scitrek_backend/**` (`.py`, migrations, `requirements.txt`, `Dockerfile`, entrypoints) | `web` (also the image for `worker` and `migrate`) |
   | `frontend/**` or `nginx/**` | `nginx` (recompiles the Vite bundle) |
   | `.env` only | nothing — `up -d` recreates with the new environment |

   `web` is rebuilt every run regardless: with a warm layer cache only the final
   `COPY . .` layer re-runs, a few seconds. `nginx` is rebuilt only when needed
   because the frontend build is slow.
4. `docker compose run --rm migrate` — idempotent; a no-op when there are no new
   migrations, and it also re-runs `collectstatic`.
5. `docker compose up -d --no-deps web worker nginx` — recreates only the
   services whose image or config changed. Expect a few seconds of downtime on
   the recreate; deploy off-hours.
6. `scripts/smoke_test.sh https://$TLS_DOMAIN`. On failure it resets the
   checkout to the previous commit, rebuilds, recreates, and re-smokes —
   **code rollback only**. A migration is not un-applied; if the failed deploy
   changed migration files the script says so, and you restore the pre-deploy
   RDS snapshot if that migration was not backward compatible.

A `flock` guard prevents overlapping runs.

Optional pre-migration RDS snapshot — set on the box (e.g. in
`/etc/default/scitrek-deploy`, sourced by the SSM command, or exported in the
deploy user's environment):

```
RDS_SNAPSHOT_ID_PREFIX=scitrek-biomod-predeploy
RDS_DB_INSTANCE_ID=scitrek-biomod
```

When set and the deploy changes migration files, `deploy.sh` takes and waits on
an RDS snapshot before `migrate` runs. The instance role then also needs
`rds:CreateDBSnapshot` and `rds:DescribeDBSnapshots`.

### One-time setup

**On the box** (`ubuntu` user):

```bash
sudo mkdir -p /opt/scitrek && sudo chown ubuntu:ubuntu /opt/scitrek
cd /opt/scitrek
git clone https://github.com/rafael-solorzano/scitrek-bioinformatics.git
cd scitrek-bioinformatics && git checkout main
# create backend/scitrek_backend/.env per ec2-bioinformatics-mod.md
```

**IAM role for GitHub Actions** — a role with a trust policy for the GitHub OIDC
provider scoped to this repo and `ref:refs/heads/main`, and permissions:

```json
[
  {"Effect": "Allow", "Action": ["ssm:SendCommand"],
   "Resource": [
     "arn:aws:ec2:us-west-2:<account>:instance/<i-...>",
     "arn:aws:ssm:us-west-2::document/AWS-RunShellScript"
   ]},
  {"Effect": "Allow", "Action": ["ssm:GetCommandInvocation"], "Resource": "*"}
]
```

**Repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | the role ARN above |
| `AWS_REGION` | `us-west-2` |
| `DEPLOY_INSTANCE_ID` | the EC2 instance id |

**Deploy branch** — `main`, via a normal PR merge. `deploy.yml` calls `ci.yml`
as a reusable workflow (`workflow_call`), so it re-runs the full suite on the
merge commit regardless of what triggered `ci.yml` directly.

### Local pre-push hook

```bash
git config core.hooksPath scripts/git-hooks
```

`scripts/git-hooks/pre-push` validates `docker-compose.yml` and
`docker-compose.e2e.yml` interpolation before a push leaves your machine. The
full suite runs in CI.

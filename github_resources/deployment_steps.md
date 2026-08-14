# SciTrek deployment

The previous manual EC2/nginx configuration-swapping instructions have been
replaced by the reproducible production workflow in
[`docs/deployment.md`](../docs/deployment.md).

That runbook covers the managed PostgreSQL contract, one-shot migrations,
persistent media, TLS bootstrap and renewal, health checks, deployment updates,
and smoke verification. Do not restore the older workflow: nginx now starts
with a short-lived bootstrap certificate specifically so ACME issuance does not
require editing configuration on the host.

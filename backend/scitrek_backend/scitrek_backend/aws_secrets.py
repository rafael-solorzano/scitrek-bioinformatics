"""Load secrets from AWS Secrets Manager into the process environment.

Opt-in and inert by default. Unless ``AWS_SECRETS_MANAGER_SECRET_ID`` is set,
:func:`load_into_environ` returns immediately and the application reads the same
plain environment variables it always has -- local development, CI, and the
Render deployment path are unaffected. On the EC2 deployment the variable points
at a Secrets Manager secret so the sensitive values never sit in the on-disk
``.env`` file.

The secret must be a JSON object whose keys are environment variable names::

    {"DJANGO_SECRET_KEY": "...", "DATABASE_PASSWORD": "...",
     "DATABASE_USER": "scitrek_admin", "DATABASE_NAME": "scitrek"}

Call this *before* Django settings are imported: production settings read
``os.environ`` at import time and fail fast on anything missing. ``wsgi.py``,
``asgi.py``, ``celery.py`` and ``manage.py`` each call it as an early action.

Values already present in the environment are never overwritten, so Compose,
the shell, or an operator debugging a single key still win over the secret,
and repeated calls are harmless.
"""

from __future__ import annotations

import json
import os

SECRET_ID_ENV = "AWS_SECRETS_MANAGER_SECRET_ID"

_loaded = False


def load_into_environ() -> None:
    """Fetch the configured secret once and merge it into ``os.environ``.

    Does nothing if :data:`SECRET_ID_ENV` is unset. Raises :class:`RuntimeError`
    if the secret is configured but cannot be fetched or parsed -- a broken
    secret store must stop the process, not let it fall through to a
    half-configured app.
    """
    global _loaded
    if _loaded:
        return

    secret_id = os.environ.get(SECRET_ID_ENV, "").strip()
    if not secret_id:
        _loaded = True
        return

    region = (
        os.environ.get("AWS_REGION", "").strip()
        or os.environ.get("AWS_DEFAULT_REGION", "").strip()
    )
    if not region:
        raise RuntimeError(
            f"{SECRET_ID_ENV} is set but AWS_REGION is not; boto3 needs a "
            "region to reach Secrets Manager"
        )

    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError as exc:  # pragma: no cover - boto3 is a hard dependency
        raise RuntimeError(
            "AWS Secrets Manager is configured but boto3 is not installed"
        ) from exc

    client = boto3.client("secretsmanager", region_name=region)
    try:
        response = client.get_secret_value(SecretId=secret_id)
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(
            f"could not read secret {secret_id!r} from AWS Secrets Manager: {exc}"
        ) from exc

    raw = response.get("SecretString")
    if raw is None:
        raise RuntimeError(
            f"secret {secret_id!r} has no SecretString; binary secrets are not supported"
        )

    try:
        values = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"secret {secret_id!r} is not valid JSON: {exc}"
        ) from exc
    if not isinstance(values, dict):
        raise RuntimeError(
            f"secret {secret_id!r} must be a JSON object of environment "
            f"variables, got {type(values).__name__}"
        )

    for key, value in values.items():
        if value is None:
            continue
        os.environ.setdefault(str(key), str(value))

    _loaded = True

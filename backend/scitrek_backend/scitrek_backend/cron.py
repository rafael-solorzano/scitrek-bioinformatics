# scitrek_backend/cron.py
"""HTTP trigger for periodic work, for platforms with no scheduler of their own.

A free platform tier may offer neither a background worker nor a cron job. This
endpoint lets an external scheduler -- a GitHub Actions workflow, an uptime
pinger -- drive the periodic sweep over HTTP instead.

It is closed unless TASK_RUNNER_TOKEN is set, and it is not a general-purpose
command runner: the only thing it can do is deliver messages that are already
due, which is idempotent and safe to trigger more often than needed.
"""

import secrets
from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.http import Http404, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


@csrf_exempt
@require_POST
def run_due_messages(request):
    expected = settings.TASK_RUNNER_TOKEN
    if not expected:
        # 404 rather than 403: an unconfigured deployment should not advertise
        # that this endpoint exists at all.
        raise Http404

    presented = request.headers.get('X-Task-Token', '')
    # compare_digest over ==: the comparison time must not depend on how many
    # leading characters a guess got right.
    if not secrets.compare_digest(presented, expected):
        return JsonResponse({'detail': 'forbidden'}, status=403)

    out = StringIO()
    call_command('send_due_messages', stdout=out, stderr=out)
    return JsonResponse({'status': 'ok', 'detail': out.getvalue().strip()})

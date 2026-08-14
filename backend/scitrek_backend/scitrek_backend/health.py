from django.db import connection
from django.core.cache import caches
from django.http import JsonResponse
from django.views.decorators.http import require_GET


def database_is_ready():
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
        cursor.fetchone()


def cache_is_ready():
    # A cache miss is fine; executing the lookup proves the configured backend
    # is reachable. This is Redis in production and in-process memory in tests.
    caches['default'].get('__scitrek_readiness__')


@require_GET
def liveness(request):
    return JsonResponse({'status': 'ok'})


@require_GET
def readiness(request):
    try:
        database_is_ready()
        cache_is_ready()
    except Exception:
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ready'})

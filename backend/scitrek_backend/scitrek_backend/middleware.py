"""Response middleware for headers Django does not set on its own.

Django's ``SecurityMiddleware`` already emits HSTS, ``X-Content-Type-Options``,
and ``Referrer-Policy``, and ``XFrameOptionsMiddleware`` emits
``X-Frame-Options``. It has no equivalent for Content-Security-Policy or
Permissions-Policy, which the nginx edge supplies in the Compose topology.

On platforms that terminate TLS themselves and route straight to the
application (Render, for example), there is no nginx layer, so the application
has to emit those two headers or they disappear entirely. This middleware is
enabled by ``SECURITY_HEADERS_FROM_APP`` so a deployment that already has an
edge proxy setting them does not emit each header twice.
"""


class SecurityHeadersMiddleware:
    """Add Content-Security-Policy and Permissions-Policy to every response."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings

        response = self.get_response(request)

        # setdefault semantics: a view that deliberately set its own policy
        # (a narrower one, say) keeps it rather than being overwritten here.
        policy = getattr(settings, 'CONTENT_SECURITY_POLICY', '')
        if policy and 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = policy

        permissions_policy = getattr(settings, 'PERMISSIONS_POLICY', '')
        if permissions_policy and 'Permissions-Policy' not in response:
            response['Permissions-Policy'] = permissions_policy

        return response

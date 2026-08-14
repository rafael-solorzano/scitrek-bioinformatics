from unittest.mock import patch
import importlib

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings

from scitrek_backend.settings.base import (
    env_bool,
    env_bool_required,
    env_int,
    env_list,
    require_env,
    require_secret_env,
)


class SettingsHelperTests(SimpleTestCase):
    def test_env_bool_returns_default_when_missing(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertTrue(env_bool("MISSING", True))
            self.assertFalse(env_bool("MISSING", False))

    def test_env_bool_accepts_truthy_values(self):
        for value in ["1", "true", "True", "YES", "on"]:
            with self.subTest(value=value), patch.dict("os.environ", {"FLAG": value}, clear=True):
                self.assertTrue(env_bool("FLAG", False))

    def test_env_bool_rejects_non_truthy_values(self):
        for value in ["0", "false", "no", "off", "anything"]:
            with self.subTest(value=value), patch.dict("os.environ", {"FLAG": value}, clear=True):
                self.assertFalse(env_bool("FLAG", True))

    def test_env_list_parses_comma_separated_values(self):
        with patch.dict("os.environ", {"ORIGINS": "https://a.test, https://b.test ,, "}, clear=True):
            self.assertEqual(env_list("ORIGINS"), ["https://a.test", "https://b.test"])

    def test_env_list_uses_default_string(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(env_list("ORIGINS", "https://a.test,https://b.test"), ["https://a.test", "https://b.test"])

    def test_env_list_empty_missing_default_returns_empty_list(self):
        with patch.dict("os.environ", {}, clear=True):
            self.assertEqual(env_list("ORIGINS"), [])

    def test_env_int_parses_integer(self):
        with patch.dict("os.environ", {"COUNT": "3"}, clear=True):
            self.assertEqual(env_int("COUNT", 1), 3)

    def test_env_int_rejects_invalid_value(self):
        with patch.dict("os.environ", {"COUNT": "many"}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                env_int("COUNT", 1)

    def test_require_env_returns_value(self):
        with patch.dict("os.environ", {"SECRET": "value"}, clear=True):
            self.assertEqual(require_env("SECRET"), "value")

    def test_require_env_rejects_missing_value(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                require_env("SECRET")

    def test_require_env_rejects_empty_value(self):
        with patch.dict("os.environ", {"SECRET": ""}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                require_env("SECRET")

    def test_require_env_rejects_whitespace_only_value(self):
        with patch.dict("os.environ", {"SECRET": "   "}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                require_env("SECRET")

    def test_require_secret_env_rejects_example_placeholder(self):
        with patch.dict("os.environ", {"SECRET": "change-me-use-a-long-random-secret-value"}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                require_secret_env("SECRET")

    def test_require_secret_env_rejects_short_value(self):
        with patch.dict("os.environ", {"SECRET": "too-short"}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                require_secret_env("SECRET")

    def test_require_secret_env_rejects_value_django_deploy_check_warns_about(self):
        # Django's security.W009 check warns below 50 characters, so the
        # application floor must not accept a shorter key than the deploy check.
        value = "ci-only-secret-with-fortyfive-characters-2Qp8x"
        self.assertEqual(len(value), 46)
        with patch.dict("os.environ", {"SECRET": value}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                require_secret_env("SECRET")

    def test_require_secret_env_accepts_strong_non_placeholder(self):
        value = "ci-only-strong-secret-with-more-than-forty-characters-8Qp2"
        with patch.dict("os.environ", {"SECRET": value}, clear=True):
            self.assertEqual(require_secret_env("SECRET"), value)


class UrlConfigurationTests(SimpleTestCase):
    def test_swagger_route_is_not_loaded_when_debug_false(self):
        import scitrek_backend.urls as urls

        try:
            with override_settings(DEBUG=False):
                production_urls = importlib.reload(urls)
                route_names = {
                    pattern.name
                    for pattern in production_urls.urlpatterns
                    if getattr(pattern, "name", None)
                }

            self.assertNotIn("schema-swagger-ui", route_names)
        finally:
            with override_settings(DEBUG=True):
                importlib.reload(urls)


class HealthEndpointTests(TestCase):
    def test_liveness_does_not_require_database_probe(self):
        with patch('scitrek_backend.health.database_is_ready') as database_is_ready:
            response = self.client.get('/healthz/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})
        database_is_ready.assert_not_called()

    def test_readiness_checks_database(self):
        with patch('scitrek_backend.health.cache_is_ready') as cache_is_ready:
            response = self.client.get('/readyz/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ready'})
        cache_is_ready.assert_called_once_with()

    def test_readiness_returns_generic_503_when_database_probe_fails(self):
        with patch(
            'scitrek_backend.health.database_is_ready',
            side_effect=RuntimeError('sensitive database detail'),
        ):
            response = self.client.get('/api/ready/')

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'unavailable'})
        self.assertNotContains(response, 'sensitive database detail', status_code=503)

    def test_readiness_returns_generic_503_when_cache_probe_fails(self):
        with patch(
            'scitrek_backend.health.cache_is_ready',
            side_effect=RuntimeError('sensitive redis detail'),
        ):
            response = self.client.get('/readyz/')

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'unavailable'})
        self.assertNotContains(response, 'sensitive redis detail', status_code=503)


class EnvBoolRequiredTests(SimpleTestCase):
    """SECURITY_HEADERS_FROM_APP must never silently default."""

    def test_accepts_documented_true_and_false_spellings(self):
        for raw, expected in (
            ("1", True), ("true", True), ("TRUE", True), ("yes", True), ("on", True),
            ("0", False), ("false", False), ("FALSE", False), ("no", False), ("off", False),
        ):
            with patch.dict("os.environ", {"FLAG": raw}, clear=True):
                self.assertIs(env_bool_required("FLAG"), expected, msg=raw)

    def test_rejects_missing_value(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                env_bool_required("FLAG")

    def test_rejects_unparseable_value(self):
        with patch.dict("os.environ", {"FLAG": "maybe"}, clear=True):
            with self.assertRaises(ImproperlyConfigured):
                env_bool_required("FLAG")


class SecurityHeadersMiddlewareTests(TestCase):
    """Platforms without an edge proxy get CSP/Permissions-Policy from Django."""

    MIDDLEWARE_WITH_HEADERS = [
        'django.middleware.security.SecurityMiddleware',
        'django.middleware.common.CommonMiddleware',
        'scitrek_backend.middleware.SecurityHeadersMiddleware',
    ]

    def test_adds_both_policies_when_middleware_is_enabled(self):
        with override_settings(MIDDLEWARE=self.MIDDLEWARE_WITH_HEADERS):
            response = self.client.get('/healthz/')

        from django.conf import settings

        self.assertEqual(
            response['Content-Security-Policy'], settings.CONTENT_SECURITY_POLICY
        )
        self.assertEqual(
            response['Permissions-Policy'], settings.PERMISSIONS_POLICY
        )

    def test_default_policies_match_the_nginx_edge_policies(self):
        # The two topologies must not drift apart; nginx is the existing source.
        from pathlib import Path

        from django.conf import settings

        snippet = (
            Path(settings.BASE_DIR).parent.parent
            / 'nginx' / 'snippets' / 'security-headers.conf'
        )
        if not snippet.exists():  # pragma: no cover - nginx config not in image
            self.skipTest('nginx snippet is not present in this build context')

        text = snippet.read_text()
        self.assertIn(settings.CONTENT_SECURITY_POLICY, text)
        self.assertIn(settings.PERMISSIONS_POLICY, text)

    def test_does_not_overwrite_a_policy_the_response_already_carries(self):
        from django.http import HttpResponse

        from scitrek_backend.middleware import SecurityHeadersMiddleware

        def get_response(request):
            response = HttpResponse()
            response['Content-Security-Policy'] = "default-src 'none'"
            return response

        middleware = SecurityHeadersMiddleware(get_response)
        response = middleware(None)

        from django.conf import settings

        self.assertEqual(response['Content-Security-Policy'], "default-src 'none'")
        # The header it did not already have is still added.
        self.assertEqual(response['Permissions-Policy'], settings.PERMISSIONS_POLICY)

    def test_policies_are_absent_without_the_middleware(self):
        response = self.client.get('/healthz/')
        self.assertNotIn('Content-Security-Policy', response)
        self.assertNotIn('Permissions-Policy', response)


class HealthCheckRedirectExemptionTests(TestCase):
    """A platform health check over plain HTTP must not be answered with a 301."""

    @override_settings(SECURE_SSL_REDIRECT=True)
    def test_health_endpoints_answer_directly_over_plain_http(self):
        for path in ('/healthz/', '/readyz/', '/api/health/', '/api/ready/'):
            with self.subTest(path=path):
                with patch('scitrek_backend.health.database_is_ready'), patch(
                    'scitrek_backend.health.cache_is_ready'
                ):
                    response = self.client.get(path, secure=False)
                self.assertEqual(response.status_code, 200)

    @override_settings(SECURE_SSL_REDIRECT=True)
    def test_other_paths_are_still_redirected_to_https(self):
        response = self.client.get('/api/student/modules/', secure=False)
        self.assertEqual(response.status_code, 301)
        self.assertTrue(response['Location'].startswith('https://'))


class MediaStorageBackendTests(SimpleTestCase):
    """MEDIA_STORAGE_BACKEND selects the media backend and rejects typos."""

    def _load(self, env):
        from scitrek_backend.settings import base

        with patch.dict("os.environ", env, clear=True):
            return importlib.reload(base)

    def tearDown(self):
        from scitrek_backend.settings import base

        with patch.dict("os.environ", {}, clear=True):
            importlib.reload(base)

    def test_defaults_to_the_shared_filesystem_volume(self):
        base = self._load({})
        self.assertEqual(base.MEDIA_STORAGE_BACKEND, "filesystem")
        self.assertEqual(
            base.STORAGES["default"]["BACKEND"],
            "django.core.files.storage.FileSystemStorage",
        )

    def test_s3_backend_is_configured_privately(self):
        base = self._load(
            {
                "MEDIA_STORAGE_BACKEND": "s3",
                "MEDIA_S3_BUCKET": "scitrek-media",
                "MEDIA_S3_ACCESS_KEY_ID": "probe-key-id",
                "MEDIA_S3_SECRET_ACCESS_KEY": "probe-secret",
                "MEDIA_S3_ENDPOINT_URL": "https://example.r2.cloudflarestorage.com",
            }
        )
        options = base.STORAGES["default"]["OPTIONS"]

        self.assertEqual(
            base.STORAGES["default"]["BACKEND"], "storages.backends.s3.S3Storage"
        )
        self.assertEqual(options["bucket_name"], "scitrek-media")
        self.assertEqual(
            options["endpoint_url"], "https://example.r2.cloudflarestorage.com"
        )
        # Student uploads must never become world-readable, and a URL must never
        # be usable without a signature that expires.
        self.assertIsNone(options["default_acl"])
        self.assertTrue(options["querystring_auth"])
        self.assertLessEqual(options["querystring_expire"], 3600)
        # A second upload must not overwrite another student's file.
        self.assertFalse(options["file_overwrite"])

    def test_s3_backend_requires_its_credentials(self):
        for missing in (
            "MEDIA_S3_BUCKET",
            "MEDIA_S3_ACCESS_KEY_ID",
            "MEDIA_S3_SECRET_ACCESS_KEY",
        ):
            env = {
                "MEDIA_STORAGE_BACKEND": "s3",
                "MEDIA_S3_BUCKET": "scitrek-media",
                "MEDIA_S3_ACCESS_KEY_ID": "probe-key-id",
                "MEDIA_S3_SECRET_ACCESS_KEY": "probe-secret",
            }
            del env[missing]
            with self.subTest(missing=missing):
                with self.assertRaises(ImproperlyConfigured):
                    self._load(env)

    def test_unknown_backend_is_rejected_rather_than_ignored(self):
        with self.assertRaises(ImproperlyConfigured):
            self._load({"MEDIA_STORAGE_BACKEND": "s4"})

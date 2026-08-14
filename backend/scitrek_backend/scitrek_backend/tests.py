from unittest.mock import patch
import importlib

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings

from scitrek_backend.settings.base import (
    env_bool,
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

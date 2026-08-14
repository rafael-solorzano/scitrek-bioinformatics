from io import StringIO
from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from classroom_admin.models import Classroom


class SeedE2ESafetyTests(TestCase):
    @override_settings(DEBUG=False, E2E_RESET_ALLOWED=False)
    def test_command_refuses_non_debug_environment_without_explicit_opt_in(self):
        with patch.dict(settings.DATABASES["default"], {"NAME": "production"}), self.assertRaisesMessage(
            CommandError, "explicitly enabled E2E"
        ):
            call_command("seed_e2e", stdout=StringIO())

    @override_settings(E2E_RESET_ALLOWED=True)
    def test_reset_refuses_database_without_e2e_name(self):
        with patch.dict(settings.DATABASES["default"], {"NAME": "production"}), self.assertRaisesMessage(
            CommandError, "E2E-named database"
        ):
            call_command("seed_e2e", reset=True, stdout=StringIO())

    @override_settings(E2E_RESET_ALLOWED=True)
    def test_reset_is_idempotent_on_explicit_e2e_database(self):
        with patch.dict(settings.DATABASES["default"], {"NAME": "scitrek_e2e"}):
            call_command("seed_e2e", reset=True, stdout=StringIO())
            call_command("seed_e2e", reset=True, stdout=StringIO())

        self.assertEqual(Classroom.objects.filter(name="1001").count(), 1)

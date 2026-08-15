# classroom_admin/management/commands/send_due_messages.py
"""Deliver ScheduledMessage rows whose time has arrived.

The worker topology hands each message to Celery with an eta and lets the
worker hold it. A deployment with no worker has nothing to do the holding, so
the row itself is the schedule and this command is the clock. Run it on a
period; the resolution of the schedule is the period you choose.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from classroom_admin.models import ScheduledMessage
from classroom_admin.tasks import schedule_message_task


class Command(BaseCommand):
    help = 'Send every scheduled message whose scheduled_time has passed.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Maximum messages to deliver in one run. Bounds the runtime '
                 'when this is triggered by an HTTP request.',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        limit = options['limit']

        due = list(
            ScheduledMessage.objects
            .filter(sent=False, scheduled_time__lte=now)
            .order_by('scheduled_time')
            .values_list('id', flat=True)[:limit]
        )

        sent = 0
        failed = 0
        for msg_id in due:
            # Each message is its own transaction: one that fails must not roll
            # back the ones already delivered, and a run that dies partway
            # through leaves the rest to the next tick.
            try:
                with transaction.atomic():
                    # skip_locked so two overlapping runs divide the work rather
                    # than one waiting on the other; re-checking `sent` inside
                    # the lock closes the window where both saw it unsent.
                    locked = (
                        ScheduledMessage.objects
                        .select_for_update(skip_locked=True)
                        .filter(id=msg_id, sent=False)
                        .first()
                    )
                    if locked is None:
                        continue
                    schedule_message_task(locked.id)
            except Exception as exc:  # noqa: BLE001 - one bad row must not stop the sweep
                failed += 1
                self.stderr.write(f'scheduled message {msg_id} failed: {exc}')
            else:
                sent += 1

        self.stdout.write(f'sent={sent} failed={failed} considered={len(due)}')
        return None

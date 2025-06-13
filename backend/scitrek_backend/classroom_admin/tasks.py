#classroom_admin/tasks.py
from celery import shared_task
from classroom_admin.models import ScheduledMessage
from student_activities.models import Message
from django.utils import timezone

@shared_task
def schedule_message_task(msg_id):
    """
    Task scheduled by the API on creation of ScheduledMessage.
    Once run, it sends the message and marks it as sent.
    """
    msg = ScheduledMessage.objects.get(id=msg_id)
    # Create a real inbox Message for each student in the classroom
    from classroom_admin.models import Student
    students = msg.classroom.students.all()
    for profile in students:
        Message.objects.create(
            sender=msg.classroom.teacher,
            recipient=profile.user,
            subject=msg.subject,
            body=msg.body,
            # copy attachment if needed
        )
    msg.sent   = True
    msg.sent_at = timezone.now()
    msg.save()

@shared_task
def send_scheduled_message_task(msg_id):
    """
    Immediate send (triggered by PATCH send-now).
    """
    return schedule_message_task(msg_id)

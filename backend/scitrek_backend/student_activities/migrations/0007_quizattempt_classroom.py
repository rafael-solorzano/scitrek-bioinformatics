from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classroom_admin', '0003_alter_classroom_teacher_classroom_created_at_and_more'),
        ('student_activities', '0006_module_day_per_classroom'),
    ]

    operations = [
        migrations.AddField(
            model_name='quizattempt',
            name='classroom',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='quiz_attempts',
                to='classroom_admin.classroom',
            ),
        ),
        # Historical attempts did not retain enrollment provenance. Leave them
        # unassigned rather than attributing private work to a student's current
        # classroom. New attempts always record classroom at write time.
        migrations.AlterUniqueTogether(
            name='quizattempt',
            unique_together={('student', 'classroom', 'quiz_type')},
        ),
    ]

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from classroom_admin.models import ModuleAssignment, QuizAssignment
from .models import Module


def released_module_assignments(classroom, at=None):
    at = at or timezone.now()
    return ModuleAssignment.objects.filter(
        classroom=classroom,
        module__classroom=classroom,
    ).filter(Q(release_date__isnull=True) | Q(release_date__lte=at))


def released_modules(classroom, at=None):
    assignment_module_ids = released_module_assignments(classroom, at).values('module_id')
    return Module.objects.filter(classroom=classroom, id__in=assignment_module_ids)


def released_quiz_assignments(classroom, at=None):
    at = at or timezone.now()
    return QuizAssignment.objects.filter(classroom=classroom).filter(
        Q(release_date__isnull=True) | Q(release_date__lte=at)
    )


def score_quiz_answers(questions, attempt_data):
    """Validate a complete answer map and return canonical data and a percentage."""
    questions_by_id = {str(question.pk): question for question in questions}
    submitted = attempt_data['answers']
    submitted_ids = {str(question_id) for question_id in submitted}
    expected_ids = set(questions_by_id)

    unknown_ids = sorted(submitted_ids - expected_ids)
    missing_ids = sorted(expected_ids - submitted_ids)
    errors = {}
    if unknown_ids:
        errors['unknown_question_ids'] = unknown_ids
    if missing_ids:
        errors['missing_question_ids'] = missing_ids
    if errors:
        raise ValidationError({'attempt_data': errors})

    canonical_answers = {}
    correct = 0
    for question_id, question in questions_by_id.items():
        selected = submitted.get(question_id)
        if selected is None and question.pk in submitted:
            selected = submitted[question.pk]
        if not isinstance(selected, str) or selected not in question.choices:
            raise ValidationError({
                'attempt_data': {
                    'answers': {
                        question_id: 'Answer must be one of this question\'s choice keys.'
                    }
                }
            })
        canonical_answers[question_id] = selected
        if selected == question.answer:
            correct += 1

    score = (correct / len(questions_by_id)) * 100
    return {'answers': canonical_answers}, score

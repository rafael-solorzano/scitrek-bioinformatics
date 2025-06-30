from rest_framework import serializers
from .models import Workbook, Section, SectionImage, Question, StudentAnswer

class SectionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SectionImage
        fields = ['id', 'image', 'caption', 'order']

class SectionSerializer(serializers.ModelSerializer):
    images = SectionImageSerializer(many=True, read_only=True)

    class Meta:
        model  = Section
        fields = ['id', 'heading', 'order', 'content_html', 'images']

class WorkbookSerializer(serializers.ModelSerializer):
    sections      = serializers.SerializerMethodField()
    import_status = serializers.SerializerMethodField()

    class Meta:
        model  = Workbook
        fields = [
            'id', 'role', 'title', 'description', 'file',
            'import_started', 'import_finished', 'import_error',
            'import_status', 'sections',
        ]

    def get_sections(self, workbook):
        include_toc = self.context.get('include_toc', False)
        qs = workbook.sections.all()
        if not include_toc:
            qs = qs.exclude(order__lte=8)
        return SectionSerializer(qs, many=True).data

    def get_import_status(self, obj):
        if not obj.import_started:
            return 'pending'
        if obj.import_started and not obj.import_finished:
            return 'in_progress'
        return 'done'

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Question
        fields = ['id', 'workbook', 'order', 'prompt', 'input_type']

class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentAnswer
        fields = ['id', 'question', 'answer', 'updated_at']

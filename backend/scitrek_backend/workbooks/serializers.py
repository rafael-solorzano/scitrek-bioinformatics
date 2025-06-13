# workbooks/serializers.py

from rest_framework import serializers
from .models import Workbook, Section, SectionImage

class SectionImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionImage
        fields = ['id', 'image', 'caption', 'order']


class SectionSerializer(serializers.ModelSerializer):
    images = SectionImageSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'heading', 'order', 'content_html', 'images']


class WorkbookSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    import_status = serializers.SerializerMethodField()

    class Meta:
        model = Workbook
        fields = [
            'id',
            'role',
            'title',
            'description',
            'file',
            'uploaded_at',
            'import_started',
            'import_finished',
            'import_error',    # newly exposed field
            'import_status',
            'sections',
        ]

    def get_import_status(self, obj):
        if not obj.import_started:
            return 'pending'
        if obj.import_started and not obj.import_finished:
            return 'in_progress'
        return 'done'


class WorkbookCreateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = Workbook
        fields = ['role', 'title', 'description', 'file']


class SectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ['workbook', 'heading', 'order', 'content_html']


class SectionImageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionImage
        fields = ['section', 'image', 'caption', 'order']

from pathlib import Path
from urllib.parse import urlsplit

from bs4 import BeautifulSoup, Comment
from rest_framework import serializers
from rest_framework.reverse import reverse
from .models import Workbook, Section, SectionImage, Question, StudentAnswer


MAX_WORKBOOK_PDF_BYTES = 10 * 1024 * 1024

ALLOWED_SECTION_TAGS = {
    'a', 'b', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'ul',
}
ALLOWED_SECTION_ATTRIBUTES = {
    'a': {'href', 'title'},
}
DANGEROUS_SECTION_TAGS = {'embed', 'iframe', 'math', 'object', 'script', 'style', 'svg'}
SAFE_LINK_SCHEMES = {'', 'http', 'https', 'mailto'}


def sanitize_section_html(value):
    """Return a conservative HTML subset safe for direct browser rendering."""
    soup = BeautifulSoup(value or '', 'html.parser')
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    for tag in list(soup.find_all(True)):
        if tag.name is None:
            continue
        if tag.name in DANGEROUS_SECTION_TAGS:
            tag.decompose()
            continue
        if tag.name not in ALLOWED_SECTION_TAGS:
            tag.unwrap()
            continue

        allowed_attributes = ALLOWED_SECTION_ATTRIBUTES.get(tag.name, set())
        tag.attrs = {
            name: attribute_value
            for name, attribute_value in tag.attrs.items()
            if name in allowed_attributes
        }
        if tag.name == 'a' and 'href' in tag.attrs:
            href = str(tag.attrs['href']).strip()
            if urlsplit(href).scheme.lower() not in SAFE_LINK_SCHEMES:
                del tag.attrs['href']
            else:
                tag.attrs['href'] = href

    return ''.join(str(node) for node in soup.contents)

class SectionImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model  = SectionImage
        fields = ['id', 'image', 'caption', 'order']

    def get_image(self, obj):
        if not obj.image:
            return None
        return reverse(
            'section-image-download',
            kwargs={'pk': obj.section_id, 'image_id': obj.pk},
            request=self.context.get('request'),
        )

class SectionSerializer(serializers.ModelSerializer):
    images = SectionImageSerializer(many=True, read_only=True)

    class Meta:
        model  = Section
        fields = ['id', 'heading', 'order', 'content_html', 'images']

    def validate_content_html(self, value):
        return sanitize_section_html(value)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['content_html'] = sanitize_section_html(data['content_html'])
        return data

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
        return SectionSerializer(qs, many=True, context=self.context).data

    def get_import_status(self, obj):
        if obj.import_error:
            return 'failed'
        if not obj.import_started:
            return 'pending'
        if obj.import_started and not obj.import_finished:
            return 'in_progress'
        return 'done'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['file'] = (
            reverse(
                'workbook-download',
                kwargs={'pk': instance.pk},
                request=self.context.get('request'),
            )
            if instance.file else None
        )
        return data

    def validate_file(self, file):
        if not file:
            return file

        name = Path(file.name or '').name
        if Path(name).suffix.lower() != '.pdf':
            raise serializers.ValidationError('Workbook file must use a .pdf extension.')

        content_type = (getattr(file, 'content_type', '') or '').lower()
        if content_type and content_type != 'application/pdf':
            raise serializers.ValidationError('Workbook file must be uploaded as application/pdf.')

        if getattr(file, 'size', 0) == 0:
            raise serializers.ValidationError('Workbook PDF cannot be empty.')
        if file.size > MAX_WORKBOOK_PDF_BYTES:
            raise serializers.ValidationError('Workbook PDF cannot exceed 10 MB.')

        position = file.tell() if hasattr(file, 'tell') else None
        header = file.read(5)
        if position is not None and hasattr(file, 'seek'):
            file.seek(position)
        if header != b'%PDF-':
            raise serializers.ValidationError('Workbook file content is not a valid PDF.')

        return file

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Question
        fields = ['id', 'workbook', 'order', 'prompt', 'input_type']

class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentAnswer
        fields = ['id', 'question', 'answer', 'updated_at']

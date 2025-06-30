from django.contrib import admin
from .models import Workbook, Section, SectionImage

@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display  = ('id', 'role', 'title', 'uploaded_at', 'import_started', 'import_finished')
    list_filter   = ('role', 'import_finished')
    search_fields = ('title',)

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display  = ('id', 'workbook', 'order', 'heading')
    list_filter   = ('workbook__role',)
    search_fields = ('heading',)

@admin.register(SectionImage)
class SectionImageAdmin(admin.ModelAdmin):
    list_display  = ('id', 'section', 'order', 'caption')
    list_filter   = ('section__workbook__role',)
    search_fields = ('caption',)

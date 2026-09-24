from django.contrib import admin
from django.utils.html import format_html
from .models import Dataset, MLModelVersion


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    """
    Admin configuration for the training and benchmark datasets catalog.
    """
    list_display = (
        'name',
        'version',
        'row_count',
        'validation_badge',
        'is_external_benchmark',
        'uploaded_by_email',
        'created_at',
    )
    list_filter = ('validation_status', 'is_external_benchmark', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    readonly_fields = (
        'id',
        'row_count',
        'label_distribution',
        'validation_status',
        'validation_errors',
        'created_at',
        'updated_at',
    )

    def uploaded_by_email(self, obj):
        return obj.uploaded_by.email if obj.uploaded_by else "System"
    uploaded_by_email.short_description = 'Uploader'

    def validation_badge(self, obj):
        colors = {
            'valid': ('#15803D', '#F0FDF4'),
            'invalid': ('#B91C1C', '#FEF2F2'),
            'pending': ('#92400E', '#FEF3C7'),
        }
        text_color, bg_color = colors.get(obj.validation_status, ('#171717', '#E5E7EB'))
        return format_html(
            '<span style="background:{}; color:{}; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:11px;">{}</span>',
            bg_color, text_color, obj.get_validation_status_display()
        )
    validation_badge.short_description = 'Validation'


@admin.register(MLModelVersion)
class MLModelVersionAdmin(admin.ModelAdmin):
    """
    Admin interface for model version registry, hyperparameter inspection,
    and single-click production promotion.
    """
    list_display = (
        'version',
        'model_name',
        'accuracy_pct',
        'f1_display',
        'dataset_name',
        'active_badge',
        'training_date',
    )
    list_filter = ('is_active', 'model_name', 'evaluation_type')
    search_fields = ('version', 'model_name', 'dataset_name', 'notes')
    ordering = ('-training_date',)
    readonly_fields = (
        'id',
        'accuracy',
        'precision',
        'recall',
        'f1_score',
        'confusion_matrix',
        'training_date',
        'created_at',
        'updated_at',
    )
    actions = ['activate_selected_version']

    fieldsets = (
        ('Version & Model Info', {
            'fields': ('version', 'model_name', 'vectorizer_name', 'is_active')
        }),
        ('Dataset Provenance', {
            'fields': ('dataset', 'dataset_name', 'dataset_size', 'train_size', 'test_size')
        }),
        ('Evaluation Benchmarks', {
            'fields': ('accuracy', 'precision', 'recall', 'f1_score', 'confusion_matrix', 'evaluation_type')
        }),
        ('Artifact Paths', {
            'fields': ('model_path', 'vectorizer_path')
        }),
        ('Audit Notes', {
            'fields': ('notes', 'training_date', 'id', 'created_at', 'updated_at')
        }),
    )

    def accuracy_pct(self, obj):
        return f"{obj.accuracy * 100:.2f}%"
    accuracy_pct.short_description = 'Accuracy'

    def f1_display(self, obj):
        return f"{obj.f1_score:.4f}"
    f1_display.short_description = 'F1-Score'

    def active_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="background:#F0FDF4; color:#15803D; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:11px;">ACTIVE</span>'
            )
        return format_html(
            '<span style="background:#F3F4F6; color:#6B7280; padding:3px 8px; border-radius:4px; font-size:11px;">INACTIVE</span>'
        )
    active_badge.short_description = 'Production Status'

    @admin.action(description="Promote selected model version to ACTIVE production")
    def activate_selected_version(self, request, queryset):
        for version in queryset:
            version.activate()
            self.message_user(request, f"Model version '{version.version}' is now active in production.")
            break  # Only one can be active

from django.contrib import admin
from django.utils.html import format_html
from .models import Prediction


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    """
    Admin configuration for Prediction audit records.
    Displays colored classification badges and provenance telemetry.
    """
    list_display = (
        'short_id',
        'prediction_badge',
        'headline_snippet',
        'confidence_display',
        'input_type',
        'user_link',
        'model_version',
        'created_at',
    )
    list_filter = ('prediction', 'input_type', 'model_version', 'created_at')
    search_fields = ('id', 'headline', 'input_text', 'user__email', 'url')
    ordering = ('-created_at',)
    readonly_fields = (
        'id',
        'user',
        'input_type',
        'url',
        'headline',
        'input_text',
        'prediction',
        'confidence',
        'probabilities',
        'model_version',
        'word_count',
        'char_count',
        'created_at',
        'updated_at',
    )

    fieldsets = (
        ('Verdict & Confidence', {
            'fields': ('prediction', 'confidence', 'probabilities', 'model_version')
        }),
        ('Origin & Content', {
            'fields': ('input_type', 'url', 'headline', 'input_text', 'word_count', 'char_count')
        }),
        ('User & Audit Metadata', {
            'fields': ('id', 'user', 'created_at', 'updated_at')
        }),
    )

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'ID'

    def prediction_badge(self, obj):
        if obj.prediction == 'Real':
            color = '#15803D'
            bg = '#F0FDF4'
        else:
            color = '#B91C1C'
            bg = '#FEF2F2'
        return format_html(
            '<span style="background:{}; color:{}; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:11px;">{}</span>',
            bg, color, obj.prediction
        )
    prediction_badge.short_description = 'Verdict'

    def headline_snippet(self, obj):
        text = obj.headline or obj.input_text
        return text[:60] + '...' if len(text) > 60 else text
    headline_snippet.short_description = 'Claim Snippet'

    def confidence_display(self, obj):
        return f"{obj.confidence:.1f}%"
    confidence_display.short_description = 'Confidence'

    def user_link(self, obj):
        return obj.user.email if obj.user else "Anonymous"
    user_link.short_description = 'Researcher'

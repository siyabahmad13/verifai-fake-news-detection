from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    """
    Admin interface for evaluating user misclassification reports
    and approving edge cases for model retraining batches.
    """
    list_display = (
        'short_id',
        'status_badge',
        'predicted_label',
        'actual_label',
        'user_email',
        'comment_snippet',
        'created_at',
        'reviewed_by',
    )
    list_filter = ('status', 'predicted_label', 'actual_label', 'created_at')
    search_fields = ('comment', 'admin_notes', 'user__email', 'prediction__id')
    ordering = ('-created_at',)
    readonly_fields = (
        'id',
        'user',
        'prediction',
        'predicted_label',
        'created_at',
        'updated_at',
    )
    actions = ['approve_reports', 'reject_reports']

    fieldsets = (
        ('Discrepancy Details', {
            'fields': ('prediction', 'predicted_label', 'actual_label', 'comment')
        }),
        ('Editorial Review', {
            'fields': ('status', 'admin_notes', 'reviewed_by', 'reviewed_at')
        }),
        ('User & Audit Info', {
            'fields': ('id', 'user', 'created_at', 'updated_at')
        }),
    )

    def short_id(self, obj):
        return str(obj.id)[:8]
    short_id.short_description = 'Report ID'

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Researcher'

    def comment_snippet(self, obj):
        return obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment
    comment_snippet.short_description = 'Justification'

    def status_badge(self, obj):
        colors = {
            'pending': ('#92400E', '#FEF3C7'),
            'under_review': ('#0369A1', '#E0F2FE'),
            'approved': ('#15803D', '#F0FDF4'),
            'rejected': ('#4B5563', '#F3F4F6'),
        }
        text_color, bg_color = colors.get(obj.status, ('#171717', '#E5E7EB'))
        return format_html(
            '<span style="background:{}; color:{}; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:11px;">{}</span>',
            bg_color, text_color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    @admin.action(description="Approve selected reports as verified errors")
    def approve_reports(self, request, queryset):
        queryset.update(
            status='approved',
            reviewed_at=timezone.now(),
            reviewed_by=request.user
        )

    @admin.action(description="Reject selected reports as invalid flags")
    def reject_reports(self, request, queryset):
        queryset.update(
            status='rejected',
            reviewed_at=timezone.now(),
            reviewed_by=request.user
        )

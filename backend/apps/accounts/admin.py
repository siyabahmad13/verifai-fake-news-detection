from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for the custom User model.
    Organizes academic affiliation, permissions, and security metadata.
    """
    list_display = (
        'email',
        'first_name',
        'last_name',
        'institution',
        'role',
        'is_staff',
        'is_active',
        'date_joined',
    )
    list_filter = ('is_staff', 'is_active', 'role', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name', 'institution')
    ordering = ('-date_joined',)
    readonly_fields = ('id', 'date_joined', 'updated_at', 'last_login')

    fieldsets = (
        ('Authentication Credentials', {
            'fields': ('email', 'password')
        }),
        ('Personal & Academic Profile', {
            'fields': ('first_name', 'last_name', 'institution', 'role')
        }),
        ('Access Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Audit Metadata', {
            'fields': ('id', 'last_login', 'date_joined', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'institution', 'role', 'password', 'is_staff', 'is_active'),
        }),
    )

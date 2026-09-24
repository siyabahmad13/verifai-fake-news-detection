"""
VERIFAI — Root URL Configuration
Enterprise REST API endpoints and OpenAPI documentation routes.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

from apps.core.views import HealthCheckView

urlpatterns = [
    # Django Administration
    path('admin/', admin.site.urls),

    # Health Check Probe
    path('api/health/', HealthCheckView.as_view(), name='health'),

    # OpenAPI Schema & Interactive Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Application REST Endpoints
    path('api/auth/', include('apps.accounts.urls', namespace='auth')),
    path('api/predictions/', include('apps.predictions.urls', namespace='predictions')),
    path('api/feedback/', include('apps.feedback.urls', namespace='feedback')),
    path('api/datasets/', include('apps.datasets.urls', namespace='datasets')),
]

# Custom Admin Site Branding
admin.site.site_header = "VERIFAI Administration & Research Telemetry"
admin.site.site_title = "VERIFAI Admin Portal"
admin.site.index_title = "Machine Learning & Automated Verification Control Center"

# Serve media files in local development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

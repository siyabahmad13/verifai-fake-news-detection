from django.urls import path
from .views import (
    DatasetUploadView,
    DatasetListView,
    DatasetDetailView,
    MLModelVersionListView,
    MLModelVersionActivateView,
)

app_name = 'datasets'

urlpatterns = [
    path('upload/', DatasetUploadView.as_view(), name='dataset_upload'),
    path('', DatasetListView.as_view(), name='dataset_list'),
    path('models/', MLModelVersionListView.as_view(), name='model_version_list'),
    path('models/<uuid:id>/activate/', MLModelVersionActivateView.as_view(), name='model_version_activate'),
    path('<uuid:id>/', DatasetDetailView.as_view(), name='dataset_detail'),
]

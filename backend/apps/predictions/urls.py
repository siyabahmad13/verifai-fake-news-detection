from django.urls import path
from .views import (
    PredictTextView,
    PredictUrlView,
    PredictionHistoryListView,
    PredictionHistoryDetailView,
)

app_name = 'predictions'

urlpatterns = [
    path('predict/', PredictTextView.as_view(), name='predict_text'),
    path('predict-url/', PredictUrlView.as_view(), name='predict_url'),
    path('history/', PredictionHistoryListView.as_view(), name='history_list'),
    path('<uuid:id>/', PredictionHistoryDetailView.as_view(), name='history_detail'),
]

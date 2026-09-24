from django.urls import path
from .views import (
    FeedbackListCreateView,
    FeedbackDetailView,
    FeedbackReviewView,
)

app_name = 'feedback'

urlpatterns = [
    path('', FeedbackListCreateView.as_view(), name='feedback_list_create'),
    path('<uuid:id>/', FeedbackDetailView.as_view(), name='feedback_detail'),
    path('<uuid:id>/review/', FeedbackReviewView.as_view(), name='feedback_review'),
]

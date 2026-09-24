from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    CustomTokenRefreshView,
    LogoutView,
    UserProfileView,
)

app_name = 'auth'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', UserProfileView.as_view(), name='profile'),
]

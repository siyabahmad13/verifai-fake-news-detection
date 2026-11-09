from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    CustomTokenRefreshView,
    LogoutView,
    UserProfileView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserToggleStatusView,
)

app_name = 'auth'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', UserProfileView.as_view(), name='profile'),
    path('users/', AdminUserListView.as_view(), name='admin_user_list'),
    path('users/<uuid:id>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('users/<uuid:id>/status/', AdminUserToggleStatusView.as_view(), name='admin_user_toggle_status'),
]

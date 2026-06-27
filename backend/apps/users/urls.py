from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import RegisterView, ProfileView, ChangePasswordView, UserSettingsView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("settings/", UserSettingsView.as_view(), name="user_settings"),
]
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterStep1View, RegisterStep2View, RegisterStep3View,
    LoginView, ProfileView, ChangePasswordView,
    ForgotPasswordView, ResetPasswordView, UserSettingsView,
)

urlpatterns = [
    path("register/step1/", RegisterStep1View.as_view(), name="register_step1"),
    path("register/step2/", RegisterStep2View.as_view(), name="register_step2"),
    path("register/step3/", RegisterStep3View.as_view(), name="register_step3"),
    path("login/", LoginView.as_view(), name="login"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    path("settings/", UserSettingsView.as_view(), name="user_settings"),
]
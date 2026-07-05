from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import User, UserSettings, EmailVerification, PasswordResetToken
from .serializers import UserSerializer, UserSettingsSerializer
from .email_service import send_verification_email, send_password_reset_email


class RegisterStep1View(APIView):
    """E-posta al, doğrulama kodu gönder."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "E-posta zorunludur."}, status=400)

        if User.objects.filter(email=email, is_verified=True).exists():
            return Response({"detail": "Bu e-posta zaten kayıtlı."}, status=400)

        # Eski doğrulanmamış kayıtları temizle
        User.objects.filter(email=email, is_verified=False).delete()

        # Yeni doğrulama token'ı oluştur
        verification = EmailVerification.objects.create(email=email)

        try:
            send_verification_email(email, verification.token)
        except Exception:
            return Response({"detail": "E-posta gönderilemedi."}, status=500)

        return Response({"detail": "Doğrulama e-postası gönderildi."})


class RegisterStep2View(APIView):
    """Token'ı doğrula."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        if not token:
            return Response({"detail": "Token zorunludur."}, status=400)

        try:
            verification = EmailVerification.objects.get(token=token)
        except EmailVerification.DoesNotExist:
            return Response({"detail": "Geçersiz token."}, status=400)

        if not verification.is_valid():
            return Response({"detail": "Token süresi dolmuş."}, status=400)

        verification.verified = True
        verification.save()

        return Response({"detail": "E-posta doğrulandı.", "email": verification.email})


class RegisterStep3View(APIView):
    """Hesabı tamamla."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        password = request.data.get("password", "")
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        level = request.data.get("level", "B1").strip()

        if not token or not password:
            return Response({"detail": "Token ve şifre zorunludur."}, status=400)

        try:
            verification = EmailVerification.objects.get(token=token, verified=True)
        except EmailVerification.DoesNotExist:
            return Response({"detail": "Geçersiz veya doğrulanmamış token."}, status=400)

        if len(password) < 8:
            return Response({"detail": "Şifre en az 8 karakter olmalı."}, status=400)

        user = User.objects.create_user(
            email=verification.email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            level=level,
            is_verified=True,
        )

        # Ayarları oluştur, seviyeyi aktar
        UserSettings.objects.create(user=user, level=level)

        verification.delete()

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({"detail": "E-posta veya şifre hatalı."}, status=400)

        if not user.is_verified:
            return Response({"detail": "E-posta adresiniz doğrulanmamış."}, status=400)

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.save()
        return Response(UserSerializer(user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password")
        new = request.data.get("new_password")

        if not request.user.check_password(current):
            return Response({"detail": "Mevcut şifre yanlış."}, status=400)
        if not new or len(new) < 8:
            return Response({"detail": "Yeni şifre en az 8 karakter olmalı."}, status=400)

        request.user.set_password(new)
        request.user.save()
        return Response({"detail": "Şifre güncellendi."})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        try:
            user = User.objects.get(email=email, is_verified=True)
        except User.DoesNotExist:
            # Güvenlik için aynı mesajı döndür
            return Response({"detail": "Şifre sıfırlama bağlantısı gönderildi."})

        token = PasswordResetToken.objects.create(user=user)
        try:
            send_password_reset_email(email, token.token)
        except Exception:
            return Response({"detail": "E-posta gönderilemedi."}, status=500)

        return Response({"detail": "Şifre sıfırlama bağlantısı gönderildi."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "")

        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({"detail": "Geçersiz token."}, status=400)

        if not reset_token.is_valid():
            return Response({"detail": "Token süresi dolmuş."}, status=400)

        if len(new_password) < 8:
            return Response({"detail": "Şifre en az 8 karakter olmalı."}, status=400)

        reset_token.user.set_password(new_password)
        reset_token.user.save()
        reset_token.used = True
        reset_token.save()

        return Response({"detail": "Şifre güncellendi."})


class UserSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obj, _ = UserSettings.objects.get_or_create(user=request.user)
        return Response(UserSettingsSerializer(obj).data)

    def patch(self, request):
        obj, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
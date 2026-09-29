from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserSettings

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    level = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "level", "created_at")

    def get_level(self, obj):
        try:
            return obj.settings.level
        except Exception:
            return getattr(obj, "level", "B1") or "B1"


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ("set_size", "level")

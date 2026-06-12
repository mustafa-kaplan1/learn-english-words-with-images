from django.contrib import admin
from .models import Word, UserWord, WordImageCache


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ("english", "turkish", "level", "part_of_speech")
    search_fields = ("english", "turkish")
    list_filter = ("level", "part_of_speech")


@admin.register(UserWord)
class UserWordAdmin(admin.ModelAdmin):
    list_display = ("user", "word", "score", "seen_count", "last_seen")
    list_filter = ("score",)
    search_fields = ("user__email", "word__english")


@admin.register(WordImageCache)
class WordImageCacheAdmin(admin.ModelAdmin):
    list_display = ("word", "cached_at")
    search_fields = ("word__english",)
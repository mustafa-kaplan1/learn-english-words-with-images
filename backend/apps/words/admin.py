from django.contrib import admin
from .models import Word, UserWord, WordImageCache, WordReport


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
    
@admin.register(WordReport)
class WordReportAdmin(admin.ModelAdmin):
    list_display = ("word", "user", "faulty_images", "translation_error", "resolved", "created_at")
    list_filter = ("resolved", "translation_error")
    search_fields = ("word__english", "user__email")
    actions = ["mark_resolved"]

    def mark_resolved(self, request, queryset):
        queryset.update(resolved=True)
    mark_resolved.short_description = "Çözüldü olarak işaretle"
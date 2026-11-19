from django.contrib import admin
from .models import (
    GrammarTopic,
    GrammarQuestion,
    UserGrammarScore,
    UserQuestionProgress,
    GrammarQuestionReport,
)


@admin.register(GrammarTopic)
class GrammarTopicAdmin(admin.ModelAdmin):
    list_display = ("code", "level", "title", "order")
    list_filter = ("level",)
    search_fields = ("code", "title", "learning_content")


@admin.register(GrammarQuestion)
class GrammarQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "source_lang", "target_lang", "question_text", "created_at")
    list_filter = ("source_lang", "target_lang", "topics__level")
    search_fields = ("question_text", "reference_translation")


@admin.register(UserGrammarScore)
class UserGrammarScoreAdmin(admin.ModelAdmin):
    list_display = ("user", "topic", "score", "updated_at")
    list_filter = ("topic__level",)


@admin.register(UserQuestionProgress)
class UserQuestionProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "question", "correct_count", "attempts", "last_answered")


@admin.register(GrammarQuestionReport)
class GrammarQuestionReportAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "user", "reason", "resolved", "created_at")
    list_filter = ("resolved", "reason", "created_at")
    search_fields = ("question__question_text", "user__email", "comment")
    actions = ["mark_as_resolved", "mark_as_unresolved"]

    @admin.action(description="Seçilen raporları çözüldü olarak işaretle")
    def mark_as_resolved(self, request, queryset):
        queryset.update(resolved=True)

    @admin.action(description="Seçilen raporları çözülmedi olarak işaretle")
    def mark_as_unresolved(self, request, queryset):
        queryset.update(resolved=False)
from django.contrib import admin
from .models import GrammarTopic, GrammarQuestion, UserGrammarScore, UserQuestionProgress


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

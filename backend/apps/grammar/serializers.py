from rest_framework import serializers
from .models import GrammarTopic, GrammarQuestion, UserGrammarScore, UserQuestionProgress


class GrammarTopicSerializer(serializers.ModelSerializer):
    user_score = serializers.SerializerMethodField()
    user_stage = serializers.SerializerMethodField()

    class Meta:
        model = GrammarTopic
        fields = [
            "id",
            "code",
            "level",
            "title",
            "learning_content",
            "turkish_description",
            "order",
            "user_score",
            "user_stage",
        ]

    def get_user_score(self, obj):
        user_scores = self.context.get("user_scores", {})
        return user_scores.get(obj.id, 0)

    def get_user_stage(self, obj):
        score = self.get_user_score(obj)
        if score <= 0:
            return "unknown"
        elif score <= 5:
            return "learning"
        elif score <= 9:
            return "good"
        return "mastered"


class GrammarQuestionSerializer(serializers.ModelSerializer):
    topics = serializers.SerializerMethodField()

    class Meta:
        model = GrammarQuestion
        fields = [
            "id",
            "topics",
            "source_lang",
            "target_lang",
            "question_text",
        ]

    def get_topics(self, obj):
        return [{"code": t.code, "title": t.title} for t in obj.topics.all()]
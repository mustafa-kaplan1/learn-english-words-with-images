from rest_framework import serializers
from .models import Word, UserWord


class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Word
        fields = ("id", "english", "turkish", "level", "part_of_speech")


class UserWordSerializer(serializers.ModelSerializer):
    word = WordSerializer(read_only=True)

    class Meta:
        model = UserWord
        fields = ("id", "word", "score", "seen_count", "last_seen")


class SessionWordSerializer(serializers.ModelSerializer):
    """
    Word Learn modunda frontend'e gönderilen kelime.
    score ayrıca eklenir — UserWord'den gelir, yoksa 0.
    """
    score = serializers.SerializerMethodField()

    class Meta:
        model = Word
        fields = ("id", "english", "turkish", "level", "part_of_speech", "score")

    def get_score(self, obj):
        user_scores = self.context.get("user_scores")
        if user_scores is not None:
            return user_scores.get(obj.id, 0)
        user = self.context.get("user")
        if not user:
            return 0
        try:
            return obj.user_words.filter(user=user).values_list("score", flat=True).first() or 0
        except Exception:
            return 0


class ScoreUpdateSerializer(serializers.Serializer):
    word_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=["know", "unsure", "dont_know"])
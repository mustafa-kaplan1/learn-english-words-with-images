from django.db import models
from django.conf import settings


class Word(models.Model):
    english = models.CharField(max_length=200, unique=True)
    turkish = models.JSONField(default=list)  # ["terk etmek", "bırakmak", "vazgeçmek"]
    level = models.CharField(max_length=10, blank=True, default="")
    part_of_speech = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kelime"
        verbose_name_plural = "Kelimeler"
        ordering = ["english"]

    def __str__(self):
        return f"{self.english} — {', '.join(self.turkish)}"


class UserWord(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_words",
    )
    word = models.ForeignKey(Word, on_delete=models.CASCADE, related_name="user_words")
    score = models.IntegerField(default=0)
    seen_count = models.PositiveIntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kullanıcı Kelimesi"
        verbose_name_plural = "Kullanıcı Kelimeleri"
        unique_together = ("user", "word")
        ordering = ["score"]

    def __str__(self):
        return f"{self.user.email} — {self.word.english} ({self.score})"


class WordImageCache(models.Model):
    word = models.OneToOneField(
        Word, on_delete=models.CASCADE, related_name="image_cache"
    )
    image_urls = models.JSONField(default=list)
    cached_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Görsel Önbellek"
        verbose_name_plural = "Görsel Önbellekler"

    def __str__(self):
        return f"Cache: {self.word.english}"
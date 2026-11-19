from django.db import models
from django.conf import settings


class GrammarTopic(models.Model):
    LEVEL_CHOICES = [
        ("A1", "A1"),
        ("A2", "A2"),
        ("B1", "B1"),
        ("B2", "B2"),
        ("C1", "C1"),
    ]

    code = models.CharField(max_length=10, unique=True)  # Örn: A1.01
    level = models.CharField(max_length=2, choices=LEVEL_CHOICES)
    title = models.CharField(max_length=255)
    learning_content = models.TextField(blank=True, default="")
    turkish_description = models.TextField(blank=True, default="")
    order = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Gramer Konusu"
        verbose_name_plural = "Gramer Konuları"
        ordering = ["order", "code"]

    def __str__(self):
        return f"{self.code} - {self.title}"


class GrammarQuestion(models.Model):
    LANG_CHOICES = [
        ("tr", "Türkçe"),
        ("en", "İngilizce"),
    ]

    topics = models.ManyToManyField(GrammarTopic, related_name="questions")
    source_lang = models.CharField(max_length=2, choices=LANG_CHOICES)
    target_lang = models.CharField(max_length=2, choices=LANG_CHOICES)
    question_text = models.TextField()  # Kullanıcıya verilen cümle
    reference_translation = models.TextField()  # Referans doğru çeviri
    alternatives = models.JSONField(default=list, blank=True)  # Varsa alternatif çeviriler
    included_words = models.ManyToManyField("words.Word", blank=True, related_name="grammar_questions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Gramer Sorusu"
        verbose_name_plural = "Gramer Soruları"

    def __str__(self):
        return f"[{self.source_lang}->{self.target_lang}] {self.question_text[:40]}"


class UserGrammarScore(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="grammar_scores",
    )
    topic = models.ForeignKey(
        GrammarTopic,
        on_delete=models.CASCADE,
        related_name="user_scores",
    )
    score = models.IntegerField(default=0)  # 0 - 10 arası
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kullanıcı Gramer Skoru"
        verbose_name_plural = "Kullanıcı Gramer Skorları"
        unique_together = ("user", "topic")

    def __str__(self):
        return f"{self.user} - {self.topic.code}: {self.score}"

    @property
    def stage(self):
        if self.score <= 0:
            return "unknown"  # Bilmediğim
        elif self.score <= 5:
            return "learning"  # Öğrendiğim
        elif self.score <= 9:
            return "good"  # İyi Bildiğim
        return "mastered"  # Tamamlandı


class UserQuestionProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="question_progress",
    )
    question = models.ForeignKey(
        GrammarQuestion,
        on_delete=models.CASCADE,
        related_name="user_progress",
    )
    correct_count = models.IntegerField(default=0)  # 2 kere doğru yapan bir daha görmez
    attempts = models.IntegerField(default=0)
    last_answered = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kullanıcı Soru İlerlemesi"
        verbose_name_plural = "Kullanıcı Soru İlerlemeleri"
        unique_together = ("user", "question")

    def __str__(self):
        return f"{self.user} - Q{self.question_id}: {self.correct_count} doğru"


class GrammarQuestionReport(models.Model):
    REPORT_REASONS = [
        ("wrong_translation", "Hatalı Çeviri"),
        ("typo", "Yazım / İmla Hatası"),
        ("missing_alternative", "Eksik Doğru Alternatif"),
        ("other", "Diğer"),
    ]

    question = models.ForeignKey(
        GrammarQuestion,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="grammar_reports",
    )
    reason = models.CharField(
        max_length=50,
        choices=REPORT_REASONS,
        default="wrong_translation",
    )
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Gramer Soru Raporu"
        verbose_name_plural = "Gramer Soru Raporları"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Q{self.question_id} — {self.get_reason_display()} ({self.user.email})"
import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.grammar.models import GrammarTopic, GrammarQuestion


class Command(BaseCommand):
    help = "84 gramer konusunun tamamı için hazır soru setini veritabanına yükler."

    def handle(self, *args, **options):
        fixtures_dir = os.path.join(
            settings.BASE_DIR, "apps", "grammar", "fixtures"
        )
        files = [
            "questions_a1_a2.json",
            "questions_b1.json",
            "questions_b2_c1.json",
        ]

        total_created = 0
        total_existing = 0

        for file_name in files:
            file_path = os.path.join(fixtures_dir, file_name)
            if not os.path.exists(file_path):
                self.stdout.write(self.style.WARNING(f"Dosya bulunamadı: {file_name}"))
                continue

            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            for topic_code, questions in data.items():
                try:
                    topic = GrammarTopic.objects.get(code=topic_code)
                except GrammarTopic.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(f"Konu bulunamadı: {topic_code}")
                    )
                    continue

                for q_data in questions:
                    q_text = q_data["question_text"]
                    ref = q_data["reference_translation"]
                    src = q_data.get("source_lang", "tr")
                    tgt = q_data.get("target_lang", "en")
                    alts = q_data.get("alternatives", [])

                    question, created = GrammarQuestion.objects.get_or_create(
                        question_text=q_text,
                        reference_translation=ref,
                        defaults={
                            "source_lang": src,
                            "target_lang": tgt,
                            "alternatives": alts,
                        },
                    )

                    if not question.topics.filter(id=topic.id).exists():
                        question.topics.add(topic)

                    if created:
                        total_created += 1
                    else:
                        total_existing += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Soru yükleme tamamlandı! Yeni eklenen: {total_created}, Mevcut olan: {total_existing}"
            )
        )


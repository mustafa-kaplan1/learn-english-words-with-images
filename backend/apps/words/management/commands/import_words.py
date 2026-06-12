import csv
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.words.models import Word


class Command(BaseCommand):
    help = "CSV dosyasından kelimeleri veritabanına aktarır."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            nargs="?",
            default=str(Path(__file__).resolve().parents[5] / "data" / "words.csv"),
            help="CSV dosyasının yolu (varsayılan: backend/data/words.csv)",
        )

    def handle(self, *args, **options):
        path = Path(options["csv_path"])

        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Dosya bulunamadı: {path}"))
            return

        created = 0
        skipped = 0

        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                english = row.get("english", "").strip()
                turkish = row.get("turkish", "").strip()

                if not english or not turkish:
                    skipped += 1
                    continue

                _, was_created = Word.objects.get_or_create(
                    english=english,
                    defaults={
                        "turkish": turkish,
                        "level": row.get("level", "").strip(),
                        "part_of_speech": row.get("part_of_speech", "").strip(),
                    },
                )
                if was_created:
                    created += 1
                else:
                    skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Tamamlandı: {created} kelime eklendi, {skipped} atlandı."
            )
        )
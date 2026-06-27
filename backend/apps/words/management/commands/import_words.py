import json
import time
from pathlib import Path
from django.core.management.base import BaseCommand
from apps.words.models import Word
from deep_translator import GoogleTranslator


def get_translations(word: str, pos: str) -> list:
    is_verb = "verb" in pos.lower()

    queries = [
        word,
        f"{word} ({pos})" if pos else word,
        f"to {word}" if is_verb else f"{word} olarak",
    ]

    results = []
    for q in queries:
        try:
            tr = GoogleTranslator(source="en", target="tr").translate(q).strip()
            if "(" in tr:
                tr = tr[:tr.index("(")].strip()
            tr = tr.rstrip(".").strip()

            if not tr:
                continue
            if tr.lower() in [r.lower() for r in results]:
                continue
            if results and (
                results[0].lower() in tr.lower() or
                tr.lower() in results[0].lower()
            ):
                continue

            results.append(tr)
        except Exception:
            pass
        time.sleep(0.3)

    return results[:3]


class Command(BaseCommand):
    help = "Oxford JSON + googletrans ile kelimeleri içe aktarır."

    def add_arguments(self, parser):
        parser.add_argument(
            "json_path",
            nargs="?",
            default=str(Path(__file__).resolve().parents[5] / "data" / "words.json"),
            help="JSON dosyasının yolu (varsayılan: backend/data/words.json)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Kaç kelime aktarılsın (test için)",
        )
        parser.add_argument(
            "--skip-existing",
            action="store_true",
            help="Zaten veritabanında olan kelimeleri atla",
        )

    def handle(self, *args, **options):
        path = Path(options["json_path"])

        if not path.exists():
            self.stderr.write(self.style.ERROR(f"Dosya bulunamadı: {path}"))
            return

        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        if options["limit"]:
            data = data[: options["limit"]]

        # Tekrar eden kelimeleri filtrele
        seen_words = set()
        unique_data = []
        for item in data:
            w = item.get("value", {}).get("word", "").strip().lower()
            if w and w not in seen_words:
                seen_words.add(w)
                unique_data.append(item)
        data = unique_data

        total = len(data)
        created = 0
        updated = 0
        skipped = 0
        failed = 0

        self.stdout.write(f"{total} unique kelime işlenecek...\n")

        for i, item in enumerate(data, 1):
            val = item.get("value", {})
            english = val.get("word", "").strip()
            pos = val.get("type", "").strip()
            level = val.get("level", "").strip()

            if not english:
                skipped += 1
                continue

            existing = Word.objects.filter(english=english).first()

            if existing and options["skip_existing"]:
                self.stdout.write(f"  [{i}/{total}] Atlandı: {english}")
                skipped += 1
                continue

            translations = get_translations(english, pos)

            if not translations:
                self.stderr.write(f"  [{i}/{total}] Çeviri alınamadı: {english}")
                failed += 1
                translations = []

            if existing:
                existing.turkish = translations
                existing.level = level
                existing.part_of_speech = pos
                existing.save()
                updated += 1
            else:
                Word.objects.create(
                    english=english,
                    turkish=translations,
                    level=level,
                    part_of_speech=pos,
                )
                created += 1

            tr_str = " / ".join(translations) if translations else "—"
            self.stdout.write(f"  [{i}/{total}] {english} → {tr_str}")

        self.stdout.write(self.style.SUCCESS(
            f"\nTamamlandı: {created} eklendi, {updated} güncellendi, "
            f"{skipped} atlandı, {failed} çeviri alınamadı."
        ))
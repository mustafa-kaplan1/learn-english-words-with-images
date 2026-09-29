from django.core.management.base import BaseCommand
from apps.words.models import WordReport
from apps.words import ai_service


class Command(BaseCommand):
    help = "Kullanıcıların bildirdiği hatalı görselleri Google Gemini Imagen 3 ile üretip Cloudflare R2'ye yükler."

    def add_arguments(self, parser):
        parser.add_argument(
            "--report-id",
            type=int,
            help="Yalnızca belirtilen ID'ye sahip raporu çöz",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="İşlenecek maksimum rapor sayısı (varsayılan: 10)",
        )

    def handle(self, *args, **options):
        report_id = options.get("report_id")
        limit = options.get("limit")

        if report_id:
            reports = WordReport.objects.filter(id=report_id)
            if not reports.exists():
                self.stderr.write(self.style.ERROR(f"Rapor bulunamadı: ID #{report_id}"))
                return
        else:
            reports = WordReport.objects.filter(resolved=False).order_by("created_at")[:limit]

        total = reports.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("Çözülecek bekleyen rapor bulunamadı."))
            return

        self.stdout.write(f"Toplam {total} adet rapor Gemini & R2 ile işleniyor...\n")

        success_count = 0
        failed_count = 0

        for i, report in enumerate(reports, 1):
            word = report.word
            self.stdout.write(
                f"[{i}/{total}] Rapor #{report.id} işleniyor: Kelime='{word.english}', Hatalı İndeksler={report.faulty_images}"
            )
            try:
                new_urls = ai_service.resolve_word_report(report)
                for u in new_urls:
                    self.stdout.write(self.style.SUCCESS(f"  ✓ Yeni Görsel Yüklendi: {u}"))
                success_count += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"  ✗ Hata oluştu: {e}"))
                failed_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nİşlem Tamamlandı: {success_count} başarılı, {failed_count} hatalı."
        ))

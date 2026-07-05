import os
import base64
from django.contrib import admin
from django.urls import path
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Count
from .models import Word, UserWord, WordImageCache, WordReport
from . import services


def save_gemini_image(word_english: str, slot: int, b64_data: str) -> str:
    """Base64 Gemini görselini media klasörüne kaydeder, URL döner."""
    from django.conf import settings
    folder = os.path.join(settings.MEDIA_ROOT, "word_images")
    os.makedirs(folder, exist_ok=True)
    filename = f"{word_english.lower().replace(' ', '_')}_slot{slot}.png"
    filepath = os.path.join(folder, filename)
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(b64_data))
    return f"{settings.MEDIA_URL}word_images/{filename}"


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ("english_link", "turkish_display", "level", "part_of_speech", "open_report_count")
    search_fields = ("english",)
    list_filter = ("level", "part_of_speech")

    def english_link(self, obj):
        from django.utils.html import format_html
        return format_html(
            '<a href="/admin/words/word/{}/edit-full/">{}</a>',
            obj.id, obj.english
        )
    english_link.short_description = "Kelime"

    def turkish_display(self, obj):
        return ", ".join(obj.turkish) if obj.turkish else "—"
    turkish_display.short_description = "Türkçe"

    def open_report_count(self, obj):
        count = obj.reports.count()
        if count > 0:
            from django.utils.html import format_html
            return format_html(
                '<span style="color: #ef4444; font-weight: bold;">⚠ {} rapor</span>', count
            )
        return "—"
    open_report_count.short_description = "Rapor"

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "<int:word_id>/edit-full/",
                self.admin_site.admin_view(self.edit_full_view),
                name="words_word_edit_full",
            ),
            path(
                "<int:word_id>/fetch-pexels/<int:slot>/",
                self.admin_site.admin_view(self.fetch_pexels_slot),
                name="words_word_fetch_pexels",
            ),
            path(
                "<int:word_id>/generate-gemini/<int:slot>/",
                self.admin_site.admin_view(self.generate_gemini_slot),
                name="words_word_generate_gemini",
            ),
        ]
        return custom + urls

    def edit_full_view(self, request, word_id):
        word = get_object_or_404(Word, pk=word_id)
        cache, _ = WordImageCache.objects.get_or_create(word=word, defaults={"image_urls": []})

        # Raporları topla ve say
        all_reports = WordReport.objects.filter(word=word)
        total_reports = all_reports.count()

        # Görsel bazlı rapor sayıları
        image_counts = [0, 0, 0, 0]
        translation_count = 0
        for report in all_reports:
            for slot in report.faulty_images:
                if 0 <= slot < 4:
                    image_counts[slot] += 1
            if report.translation_error:
                translation_count += 1

        if request.method == "POST":
            # Türkçe çevirileri güncelle
            translations = []
            for i in range(3):
                val = request.POST.get(f"turkish_{i}", "").strip()
                if val:
                    translations.append(val)
            word.turkish = translations
            word.save()

            # Görselleri güncelle
            images = []
            for i in range(4):
                url = request.POST.get(f"image_{i}", "").strip()
                images.append(url)
            cache.image_urls = images
            cache.save()

            # Tüm raporları sil
            deleted_count = all_reports.count()
            all_reports.delete()

            messages.success(
                request,
                f"'{word.english}' güncellendi. {deleted_count} rapor silindi."
            )
            return redirect("admin:words_word_edit_full", word_id=word.id)

        images = list(cache.image_urls) + [""] * 4
        images = images[:4]
        translations = list(word.turkish) + [""] * 3
        translations = translations[:3]

        context = {
            **self.admin_site.each_context(request),
            "word": word,
            "images": images,
            "translations": translations,
            "total_reports": total_reports,
            "image_counts": image_counts,
            "translation_count": translation_count,
            "title": f"Kelime düzenle: {word.english}",
        }
        return render(request, "admin/words/word_edit_full.html", context)

    def fetch_pexels_slot(self, request, word_id, slot):
        word = get_object_or_404(Word, pk=word_id)
        new_images = services._fetch_from_pexels(word.english)

        if new_images:
            cache, _ = WordImageCache.objects.get_or_create(word=word, defaults={"image_urls": []})
            images = list(cache.image_urls) + [""] * 4
            images = images[:4]
            idx = slot % len(new_images)
            images[slot] = new_images[idx]
            cache.image_urls = images
            cache.save()
            return JsonResponse({"success": True, "url": images[slot]})

        return JsonResponse({"success": False, "error": "Pexels'tan görsel alınamadı."})

    def generate_gemini_slot(self, request, word_id, slot):
        from .gemini_service import generate_image_for_word
        word = get_object_or_404(Word, pk=word_id)

        b64 = generate_image_for_word(word.english, word.part_of_speech)
        if not b64:
            return JsonResponse({"success": False, "error": "Gemini görsel üretemedi."})

        url = save_gemini_image(word.english, slot, b64)
        cache, _ = WordImageCache.objects.get_or_create(word=word, defaults={"image_urls": []})
        images = list(cache.image_urls) + [""] * 4
        images = images[:4]
        images[slot] = url
        cache.image_urls = images
        cache.save()

        return JsonResponse({"success": True, "url": url})


@admin.register(UserWord)
class UserWordAdmin(admin.ModelAdmin):
    list_display = ("user", "word", "score", "seen_count", "last_seen")
    list_filter = ("score",)
    search_fields = ("user__email", "word__english")


@admin.register(WordImageCache)
class WordImageCacheAdmin(admin.ModelAdmin):
    list_display = ("word", "cached_at")
    search_fields = ("word__english",)


@admin.register(WordReport)
class WordReportAdmin(admin.ModelAdmin):
    list_display = ("word_link", "report_summary", "user_count", "created_at")
    search_fields = ("word__english",)
    ordering = ("-created_at",)

    def changelist_view(self, request, extra_context=None):
        # Kelimeleri rapor sayısına göre sırala
        from django.db.models import Count
        top_words = (
            WordReport.objects.values("word__id", "word__english")
            .annotate(count=Count("id"))
            .order_by("-count")[:50]
        )
        extra_context = extra_context or {}
        extra_context["top_words"] = top_words
        return super().changelist_view(request, extra_context=extra_context)

    def word_link(self, obj):
        from django.utils.html import format_html
        return format_html(
            '<a href="/admin/words/word/{}/edit-full/">{}</a>',
            obj.word.id, obj.word.english
        )
    word_link.short_description = "Kelime"

    def report_summary(self, obj):
        parts = []
        if obj.faulty_images:
            parts.append(f"Görsel: {obj.faulty_images}")
        if obj.translation_error:
            parts.append("Çeviri hatası")
        return " | ".join(parts) if parts else "—"
    report_summary.short_description = "Sorun"

    def user_count(self, obj):
        return obj.user.email
    user_count.short_description = "Kullanıcı"
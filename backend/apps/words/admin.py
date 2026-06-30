from django.contrib import admin
from django.urls import path
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse
from .models import Word, UserWord, WordImageCache, WordReport
from . import services


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ("english_link", "turkish_display", "level", "part_of_speech", "report_count")
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

    def report_count(self, obj):
        count = obj.reports.filter(resolved=False).count()
        if count > 0:
            return f"⚠ {count} rapor"
        return "—"
    report_count.short_description = "Açık rapor"

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
        ]
        return custom + urls

    def edit_full_view(self, request, word_id):
        word = get_object_or_404(Word, pk=word_id)
        cache, _ = WordImageCache.objects.get_or_create(word=word, defaults={"image_urls": []})
        reports = WordReport.objects.filter(word=word, resolved=False).select_related("user")

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
                if url:
                    images.append(url)
            cache.image_urls = images
            cache.save()

            # Raporları çözüldü işaretle
            if request.POST.get("resolve_reports") == "1":
                reports.update(resolved=True)

            messages.success(request, f"'{word.english}' güncellendi.")
            return redirect("admin:words_word_edit_full", word_id=word.id)

        # Görsel listesini 4 slota tamamla
        images = list(cache.image_urls) + [""] * 4
        images = images[:4]

        # Türkçe çevirileri 3 slota tamamla
        translations = list(word.turkish) + [""] * 3
        translations = translations[:3]

        context = {
            **self.admin_site.each_context(request),
            "word": word,
            "images": images,
            "translations": translations,
            "reports": reports,
            "title": f"Kelime düzenle: {word.english}",
        }
        return render(request, "admin/words/word_edit_full.html", context)

    def fetch_pexels_slot(self, request, word_id, slot):
        word = get_object_or_404(Word, pk=word_id)
        new_images = services._fetch_from_pexels(word.english)

        if new_images and slot < len(new_images):
            cache, _ = WordImageCache.objects.get_or_create(word=word, defaults={"image_urls": []})
            images = list(cache.image_urls) + [""] * 4
            images = images[:4]
            images[slot] = new_images[slot % len(new_images)]
            cache.image_urls = images
            cache.save()
            return JsonResponse({"success": True, "url": images[slot]})

        return JsonResponse({"success": False, "error": "Pexels'tan görsel alınamadı."})


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
    list_display = ("word", "user", "faulty_images", "translation_error", "resolved", "created_at", "edit_link")
    list_filter = ("resolved", "translation_error")
    search_fields = ("word__english", "user__email")
    actions = ["mark_resolved"]

    def mark_resolved(self, request, queryset):
        queryset.update(resolved=True)
    mark_resolved.short_description = "Çözüldü olarak işaretle"

    def edit_link(self, obj):
        from django.utils.html import format_html
        return format_html(
            '<a href="/admin/words/word/{}/edit-full/">Düzenle</a>',
            obj.word.id
        )
    edit_link.short_description = "İşlem"
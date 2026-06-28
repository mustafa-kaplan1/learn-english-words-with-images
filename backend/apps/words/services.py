import requests
from django.conf import settings
from .models import Word, UserWord, WordImageCache

# ── Sabitler ────────────────────────────────────────────────────
SCORE_MIN = -1
SCORE_MAX = 10

GROUP1_LIMIT = 10   # score = -1
GROUP2_LIMIT = 12   # score = 0
GROUP3_LIMIT = 10   # 0 < score < 10
SESSION_SIZE = 32

LEVEL_SCORES = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}


def get_session_words(user):
    from apps.users.models import UserSettings

    settings_obj, _ = UserSettings.objects.get_or_create(user=user)
    session_size = settings_obj.set_size

    per_group = session_size // 4  # her grup %25

    user_words = UserWord.objects.filter(user=user).select_related("word")
    scored = {uw.word_id: uw.score for uw in user_words}

    # Bilmediğim: score <= 0 (ve score != yeni, yani kaydı var)
    g_unknown_ids = [wid for wid, s in scored.items() if s <= 0]
    g_unknown = list(Word.objects.filter(id__in=g_unknown_ids))[:per_group]

    # Öğrendiğim: 1-5
    g_learning_uw = (
        UserWord.objects.filter(user=user, score__gte=1, score__lte=5)
        .order_by("score")
        .select_related("word")[:per_group]
    )
    g_learning = [uw.word for uw in g_learning_uw]

    # İyi bildiğim: 6-9
    g_good_uw = (
        UserWord.objects.filter(user=user, score__gte=6, score__lte=9)
        .order_by("score")
        .select_related("word")[:per_group]
    )
    g_good = [uw.word for uw in g_good_uw]

    used_ids = {w.id for w in g_unknown + g_learning + g_good}

    # Yeni kelimeler: hiç UserWord kaydı olmayan
    all_seen_ids = set(scored.keys())
    needed_new = session_size - len(g_unknown) - len(g_learning) - len(g_good)
    g_new = list(
        Word.objects.exclude(id__in=all_seen_ids).order_by("?")[:needed_new]
    )

    session = g_unknown + g_learning + g_good + g_new

    # Hâlâ eksikse yeni kelimelerle tamamla
    if len(session) < session_size:
        extra_ids = used_ids | {w.id for w in g_new}
        extra = list(
            Word.objects.exclude(id__in=extra_ids).order_by("?")[: session_size - len(session)]
        )
        session += extra

    # Karıştır ve döndür
    import random
    random.shuffle(session)
    return session[:session_size]


# ── Puan Güncelleme ─────────────────────────────────────────────
SCORE_DELTA = {
    "know": 1,
    "unsure": -1,
    "dont_know": -2,
}


def update_score(user, word_id, action):
    from apps.users.models import UserSettings

    delta = SCORE_DELTA.get(action, 0)

    # Sadece "know" aksiyonunda seviye bonusu hesapla
    if action == "know":
        try:
            word = Word.objects.get(pk=word_id)
            user_settings, _ = UserSettings.objects.get_or_create(user=user)
            user_level = LEVEL_SCORES.get(user_settings.level, 3)
            word_level = LEVEL_SCORES.get(word.level, 3)
            diff = user_level - word_level
            if diff > 1:
                delta = diff  # seviye farkı 1'den büyükse bonus puan
        except Word.DoesNotExist:
            pass

    user_word, _ = UserWord.objects.get_or_create(
        user=user,
        word_id=word_id,
        defaults={"score": 0, "seen_count": 0},
    )

    user_word.score = max(SCORE_MIN, min(SCORE_MAX, user_word.score + delta))
    user_word.seen_count += 1
    user_word.save(update_fields=["score", "seen_count", "last_seen"])

    return user_word


# ── Pexels Görsel Önbelleği ─────────────────────────────────────
PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"
IMAGE_COUNT = 4


def get_word_images(word):
    """
    WordImageCache tablosuna bakar.
    Hit → cache'den döner.
    Miss → Pexels API'den çeker, kaydeder, döner.
    """
    try:
        cache = WordImageCache.objects.get(word=word)
        if cache.image_urls:
            return cache.image_urls
    except WordImageCache.DoesNotExist:
        pass

    urls = _fetch_from_pexels(word.english)

    WordImageCache.objects.update_or_create(
        word=word,
        defaults={"image_urls": urls},
    )
    return urls


def _fetch_from_pexels(query):
    api_key = settings.PEXELS_API_KEY
    if not api_key:
        return []

    orientations = ["square", "landscape", "portrait"]
    collected = []
    seen_ids = set()

    for orientation in orientations:
        if len(collected) >= IMAGE_COUNT:
            break

        needed = IMAGE_COUNT - len(collected)
        try:
            response = requests.get(
                PEXELS_SEARCH_URL,
                headers={"Authorization": api_key},
                params={
                    "query": query,
                    "per_page": needed + 2,  # biraz fazla iste, duplicate'leri eleyeceğiz
                    "locale": "en-US",
                    "orientation": orientation,
                },
                timeout=5,
            )
            response.raise_for_status()
            photos = response.json().get("photos", [])

            for p in photos:
                if p["id"] not in seen_ids and len(collected) < IMAGE_COUNT:
                    seen_ids.add(p["id"])
                    collected.append(p["src"]["medium"])

        except requests.RequestException:
            continue

    return collected
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


# ── 32 Kelimelik Set Algoritması ────────────────────────────────
def get_session_words(user):
    """
    Kullanıcıya özel 32 kelimelik oturum seti döner.

    Grup 1: score = -1  → max 10
    Grup 2: score = 0   → max 12
    Grup 3: 0 < score < 10, küçükten büyüğe → max 10

    Eksik kalan kontenjan her zaman Grup 2 (score=0 / görülmemiş)
    ile tamamlanır ve toplam 32'ye eşitlenir.
    """
    # Kullanıcının kayıtlı kelimeleri
    user_words = UserWord.objects.filter(user=user).select_related("word")
    scored = {uw.word_id: uw.score for uw in user_words}

    # Grup 1: -1 puanlılar
    g1_ids = [wid for wid, s in scored.items() if s == SCORE_MIN]
    g1 = list(Word.objects.filter(id__in=g1_ids))[:GROUP1_LIMIT]

    # Grup 3: 0 < score < 10, küçükten büyüğe
    g3_uw = (
        UserWord.objects.filter(user=user, score__gt=0, score__lt=SCORE_MAX)
        .order_by("score")
        .select_related("word")[:GROUP3_LIMIT]
    )
    g3 = [uw.word for uw in g3_uw]

    # Kullanılan word id'leri
    used_ids = {w.id for w in g1 + g3}

    # Grup 2: score = 0 olan kayıtlı kelimeler + hiç görülmemiş kelimeler
    needed_g2 = SESSION_SIZE - len(g1) - len(g3)

    # Önce kayıtlı score=0 olanlar
    g2_registered_ids = [wid for wid, s in scored.items() if s == 0 and wid not in used_ids]
    g2_registered = list(Word.objects.filter(id__in=g2_registered_ids))

    # Yetmezse hiç UserWord kaydı olmayan kelimeler
    all_seen_ids = set(scored.keys())
    g2_unseen = list(
        Word.objects.exclude(id__in=all_seen_ids).order_by("?")[:needed_g2]
    )

    g2 = (g2_registered + g2_unseen)[:needed_g2]

    session = g1 + g2 + g3

    # Kesinlikle 32'yi aşma (edge case guard)
    return session[:SESSION_SIZE]


# ── Puan Güncelleme ─────────────────────────────────────────────
SCORE_DELTA = {
    "know": 1,
    "unsure": -1,
    "dont_know": -2,
}


def update_score(user, word_id, action):
    """
    action: 'know' | 'unsure' | 'dont_know'
    UserWord kaydı yoksa oluşturur.
    Skoru SCORE_MIN ve SCORE_MAX sınırları içinde tutar.
    Güncellenen UserWord nesnesini döner.
    """
    delta = SCORE_DELTA.get(action, 0)

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

    try:
        response = requests.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": api_key},
            params={"query": query, "per_page": IMAGE_COUNT, "locale": "en-US"},
            timeout=5,
        )
        response.raise_for_status()
        photos = response.json().get("photos", [])
        return [p["src"]["medium"] for p in photos]
    except requests.RequestException:
        return []
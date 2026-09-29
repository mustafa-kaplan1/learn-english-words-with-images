import uuid
import logging
from django.conf import settings
from botocore.config import Config
import boto3

logger = logging.getLogger(__name__)


def get_genai_client():
    """Google GenAI istemcisini döner."""
    from google import genai
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY tanımlanmamış. Lütfen .env dosyasını kontrol edin.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def get_r2_client():
    """Cloudflare R2 S3 istemcisini döner."""
    if not settings.CLOUDFLARE_ACCOUNT_ID or not settings.R2_ACCESS_KEY_ID or not settings.R2_SECRET_ACCESS_KEY:
        raise ValueError("Cloudflare R2 bilgileri eksik. Lütfen .env dosyasını kontrol edin.")
    
    endpoint_url = f"https://{settings.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def generate_word_image(english_word: str, turkish_meaning: str = "") -> bytes:
    """
    Google Imagen 3 kullanarak kare (1:1), metinsiz ve kaliteli görsel üretir.
    """
    from google.genai import types
    client = get_genai_client()

    meaning_context = f" (meaning: {turkish_meaning})" if turkish_meaning else ""
    prompt = (
        f"A clear educational and minimalist visual concept depicting the word '{english_word}'{meaning_context}. "
        f"3D digital illustration or clean studio photography, vibrant colors, soft studio lighting, "
        f"centered subject on a clean background, completely without text, no letters, no typography, "
        f"no words, no watermark."
    )

    result = client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1",
            output_mime_type="image/webp",
        ),
    )

    if not result.generated_images:
        raise RuntimeError(f"Görsel üretilemedi: {english_word}")

    return result.generated_images[0].image.image_bytes


def upload_image_to_r2(image_bytes: bytes, file_key: str) -> str:
    """
    Üretilen WebP görselini Cloudflare R2 bucket'ına yükler ve public CDN URL'ini döner.
    """
    s3 = get_r2_client()
    s3.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=file_key,
        Body=image_bytes,
        ContentType="image/webp",
        CacheControl="public, max-age=31536000, immutable",
    )

    domain = settings.R2_PUBLIC_DOMAIN.rstrip("/") if settings.R2_PUBLIC_DOMAIN else f"https://{settings.R2_BUCKET_NAME}.r2.dev"
    return f"{domain}/{file_key}"


def resolve_word_report(report) -> list:
    """
    Verilen WordReport nesnesindeki hatalı işaretlenen görselleri
    Gemini Imagen 3 ile yeniden üretir, Cloudflare R2'ye yükler ve
    WordImageCache'i güncelleyip raporu resolved=True yapar.
    
    Dönen değer: Yenilenen görsel URL'lerinin listesi
    """
    from .models import WordImageCache

    word = report.word
    cache, _ = WordImageCache.objects.get_or_create(word=word, defaults={"image_urls": []})

    urls = list(cache.image_urls)
    while len(urls) < 4:
        urls.append("")

    turkish_meaning = ""
    if isinstance(word.turkish, list) and word.turkish:
        turkish_meaning = word.turkish[0]
    elif isinstance(word.turkish, str):
        turkish_meaning = word.turkish

    updated_urls = []
    faulty_indices = report.faulty_images if isinstance(report.faulty_images, list) else []

    if not faulty_indices:
        faulty_indices = [0]

    for idx in faulty_indices:
        if not (0 <= idx < 4):
            continue

        try:
            logger.info(f"Generating image for '{word.english}' at index {idx}...")
            img_bytes = generate_word_image(word.english, turkish_meaning)
            file_key = f"words/{word.english.lower()}_{idx}_{uuid.uuid4().hex[:6]}.webp"
            logger.info(f"Uploading '{file_key}' to Cloudflare R2...")
            public_url = upload_image_to_r2(img_bytes, file_key)

            urls[idx] = public_url
            updated_urls.append(public_url)
        except Exception as e:
            logger.error(f"Error regenerating image for '{word.english}' index {idx}: {e}")
            raise e

    cache.image_urls = urls
    cache.save(update_fields=["image_urls", "cached_at"])

    report.resolved = True
    report.save(update_fields=["resolved"])

    return updated_urls

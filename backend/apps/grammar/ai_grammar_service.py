import json
import logging
import re
from typing import List, Dict, Any
from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

MODELS_TO_TRY = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.5-flash"]


def get_genai_client():
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY tanımlanmamış. .env dosyasını kontrol edin.")
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _call_gemini_json(prompt: str) -> Any:
    client = get_genai_client()
    last_err = None

    for model_name in MODELS_TO_TRY:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.5,
                ),
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                raw_text = re.sub(r"\s*```$", "", raw_text)
            return json.loads(raw_text)
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}")
            last_err = e

    raise RuntimeError(f"Tüm Gemini modelleri başarısız oldu: {last_err}")


def generate_grammar_questions(
    topic: Dict[str, str],
    level: str,
    count: int = 5,
) -> List[Dict[str, Any]]:
    """
    Yalnızca seçilen tek bir gramer konusunu pekiştiren, o seviyeye (A1, A2 vs.)
    tam uygun, başka karmaşık kural içermeyen basit ve net cümleler üretir.
    """
    topic_code = topic.get("code", "")
    topic_title = topic.get("title", "")
    topic_content = topic.get("learning_content", "")
    turkish_desc = topic.get("turkish_description", "")

    prompt = f"""
Sen uzman bir İngilizce öğretmenisin. Öğrencinin seviyesi: {level}
Hedef gramer konusu: {topic_code} - {topic_title}
Konu Kapsamı: {topic_content}
Açıklama: {turkish_desc}

Öğrenciye bu konuyu öğretmeyi amaçlayan {count} adet çeviri alıştırma sorusu oluştur.

ÇOK ÖNEMLİ PEDAGOJİK KURALLAR:
1. Sorular KESİNLİKLE sadece bu gramer kuralını öğretmeye ve pekiştirmeye odaklanmalıdır.
2. Cümlede bu kural haricinde başka hiçbir karmaşık gramer kuralı veya henüz öğrenilmemiş ileri seviye zaman/bağlaç/yapı KULLANMA.
3. Kelimeler kesinlikle {level} seviyesinin en temel, en bilinen ve en basit kelimeleri olmalıdır.
4. Cümleler kısa, doğrudan ve net olmalıdır (A1 için 3-6 kelime, A2 için 5-8 kelime).
5. Soruların bir kısmı Türkçe'den İngilizce'ye (source_lang: "tr", target_lang: "en"),
   bir kısmı İngilizce'den Türkçe'ye (source_lang: "en", target_lang: "tr") olsun.

JSON şeması:
[
  {{
    "source_lang": "tr veya en",
    "target_lang": "en veya tr",
    "question_text": "Öğrenciye gösterilecek cümle",
    "reference_translation": "Doğru ve net çeviri"
  }}
]
Yalnızca geçerli bir JSON dizisi döndür.
"""
    return _call_gemini_json(prompt)


def evaluate_translation(
    question_text: str,
    reference_translation: str,
    user_translation: str,
    source_lang: str,
    target_lang: str,
    topic_title: str,
) -> Dict[str, Any]:
    """
    Kullanıcının çevirisini değerlendirir.
    - Doğruysa doğru deyip geçer (+1 puan).
    - Ufak noktalama veya tek harf typo puan kırmaz, doğru kabul edilir ve gereksiz feedback verilmez.
    - Yanlışsa (-2 puan) veya geliştirilmesi gerekiyorsa (-1 puan) Türkçe 1 kısa cümleyle hatayı açıklar.
    """
    prompt = f"""
Sen bir dil öğretmenisin. Konu: {topic_title}

Soru ({source_lang.upper()}): "{question_text}"
Doğru Çeviri ({target_lang.upper()}): "{reference_translation}"
Öğrencinin Çevirisi ({target_lang.upper()}): "{user_translation}"

KURALLAR:
1. Ufak noktalama (nokta, soru işareti eksikliği), büyük/küçük harf veya tek harf klavye yazım hatası (typo) puanı KIRMAZ. Cümle doğru kabul edilir.
2. 'correct' (+1 puan): Anlam doğru ve hedeflenen kural doğru uygulanmışsa. Feedback'e yalnızca "Doğru!" yaz.
3. 'imperfect' (-1 puan): Anlaşılıyor ama gramer pürüzü var veya daha iyi ifade edilebilir. Feedback'te hatayı Türkçe TEK KISA CÜMLEYLE açıkla.
4. 'wrong' (-2 puan): Anlam yanlış veya temel kural hatalı. Feedback'te hatayı Türkçe TEK KISA CÜMLEYLE açıkla.

JSON formatı:
{{
  "result": "correct veya imperfect veya wrong",
  "score_delta": 1, // correct: 1, imperfect: -1, wrong: -2
  "feedback": "Doğruysa 'Doğru!', hatalıysa tek kısa cümlelik açıklama",
  "correct_translation": "{reference_translation}"
}}
Yalnızca geçerli bir JSON objesi döndür.
"""
    return _call_gemini_json(prompt)
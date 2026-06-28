from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Word, WordReport
from .serializers import SessionWordSerializer, ScoreUpdateSerializer, UserWordSerializer
from . import services


class WordSessionView(APIView):
    """GET /api/words/session/ → 32 kelimelik oturum seti"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        words = services.get_session_words(request.user)
        serializer = SessionWordSerializer(
            words, many=True, context={"user": request.user}
        )
        return Response(serializer.data)


class ScoreUpdateView(APIView):
    """PATCH /api/words/score/ → puan güncelle"""

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ScoreUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_word = services.update_score(
            user=request.user,
            word_id=serializer.validated_data["word_id"],
            action=serializer.validated_data["action"],
        )
        return Response(
            {"word_id": user_word.word_id, "score": user_word.score},
            status=status.HTTP_200_OK,
        )


class WordImagesView(APIView):
    """GET /api/words/images/<word_id>/ → 4 Pexels görseli"""

    permission_classes = [IsAuthenticated]

    def get(self, request, word_id):
        try:
            word = Word.objects.get(pk=word_id)
        except Word.DoesNotExist:
            return Response({"detail": "Kelime bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        urls = services.get_word_images(word)
        return Response({"word_id": word_id, "images": urls})


class LibraryView(APIView):
    """GET /api/words/library/ → kullanıcının tüm kelimeleri + puanlar"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_words = (
            request.user.user_words
            .select_related("word")
            .order_by("score")
        )
        serializer = UserWordSerializer(user_words, many=True)
        return Response(serializer.data)

class WordReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        word_id = request.data.get("word_id")
        faulty_images = request.data.get("faulty_images", [])
        translation_error = request.data.get("translation_error", False)

        if not word_id:
            return Response({"detail": "word_id zorunlu."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            word = Word.objects.get(pk=word_id)
        except Word.DoesNotExist:
            return Response({"detail": "Kelime bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        WordReport.objects.create(
            word=word,
            user=request.user,
            faulty_images=faulty_images,
            translation_error=translation_error,
        )
        return Response({"detail": "Rapor alındı."}, status=status.HTTP_201_CREATED)
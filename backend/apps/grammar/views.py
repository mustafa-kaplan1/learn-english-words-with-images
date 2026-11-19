import random
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import GrammarTopic, GrammarQuestion, UserGrammarScore, UserQuestionProgress
from .serializers import GrammarTopicSerializer, GrammarQuestionSerializer
from .ai_grammar_service import generate_grammar_questions, evaluate_translation


class GrammarTopicsView(APIView):
    """Gramer konularını ve kullanıcının puanlarını döner."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        level = request.query_params.get("level")
        qs = GrammarTopic.objects.all()
        if level:
            qs = qs.filter(level=level.upper())

        user_scores = dict(
            UserGrammarScore.objects.filter(user=request.user)
            .values_list("topic_id", "score")
        )

        serializer = GrammarTopicSerializer(
            qs, many=True, context={"user_scores": user_scores}
        )
        return Response(serializer.data)


class GrammarSessionStartView(APIView):
    """
    Seçilen tek bir gramer konusundan soru oturumu başlatır.
    Önce DB havuzuna bakar (<2 doğru olanlar), eksik kalırsa Gemini ile seviyeye uygun yeni soru üretir.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        topic_id = request.data.get("topic_id")
        question_count = int(request.data.get("question_count", 5))
        question_count = max(1, min(question_count, 15))

        if not topic_id:
            return Response({"detail": "Lütfen bir gramer konusu seçin."}, status=400)

        try:
            topic = GrammarTopic.objects.get(id=topic_id)
        except GrammarTopic.DoesNotExist:
            return Response({"detail": "Seçilen konu bulunamadı."}, status=404)

        # 1. Kullanıcının 2 kere doğru bildiği soruları hariç tut
        mastered_question_ids = set(
            UserQuestionProgress.objects.filter(
                user=request.user, correct_count__gte=2
            ).values_list("question_id", flat=True)
        )

        # 2. Havuzdaki uygun soruları çek
        pool_qs = (
            GrammarQuestion.objects.filter(topics=topic)
            .exclude(id__in=mastered_question_ids)
            .distinct()
            .prefetch_related("topics")
        )
        existing_questions = list(pool_qs)
        random.shuffle(existing_questions)

        selected_questions = existing_questions[:question_count]
        needed_count = question_count - len(selected_questions)

        # 3. Havuzda eksik varsa Gemini ile bu tek konuya ve seviyeye özel sorular üret
        if needed_count > 0:
            topic_dict = {
                "code": topic.code,
                "title": topic.title,
                "learning_content": topic.learning_content,
                "turkish_description": topic.turkish_description,
            }

            try:
                ai_generated = generate_grammar_questions(
                    topic=topic_dict,
                    level=topic.level,
                    count=needed_count,
                )

                for item in ai_generated:
                    q = GrammarQuestion.objects.create(
                        source_lang=item.get("source_lang", "tr"),
                        target_lang=item.get("target_lang", "en"),
                        question_text=item.get("question_text", ""),
                        reference_translation=item.get("reference_translation", ""),
                    )
                    q.topics.add(topic)
                    selected_questions.append(q)
            except Exception as e:
                if not selected_questions:
                    return Response({"detail": f"Sorular oluşturulamadı: {str(e)}"}, status=500)

        serializer = GrammarQuestionSerializer(selected_questions, many=True)
        return Response({
            "session_id": random.randint(100000, 999999),
            "topic": {"id": topic.id, "code": topic.code, "title": topic.title, "level": topic.level},
            "total_questions": len(selected_questions),
            "questions": serializer.data,
        })


class GrammarSessionSubmitView(APIView):
    """
    Kullanıcının çevirisini değerlendirir.
    Doğruysa doğru der (+1). Yanlışsa (-2) veya geliştirilebilir (-1) ise kısa hata açıklar ve doğru çeviriyi verir.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_id = request.data.get("question_id")
        user_translation = request.data.get("user_translation", "").strip()

        if not question_id:
            return Response({"detail": "question_id zorunludur."}, status=400)
        if not user_translation:
            return Response({"detail": "Çeviri boş bırakılamaz."}, status=400)

        try:
            question = GrammarQuestion.objects.prefetch_related("topics").get(id=question_id)
        except GrammarQuestion.DoesNotExist:
            return Response({"detail": "Soru bulunamadı."}, status=404)

        topics = list(question.topics.all())
        topic_title = topics[0].title if topics else "Grammar"

        try:
            eval_result = evaluate_translation(
                question_text=question.question_text,
                reference_translation=question.reference_translation,
                user_translation=user_translation,
                source_lang=question.source_lang,
                target_lang=question.target_lang,
                topic_title=topic_title,
            )
        except Exception as e:
            return Response({"detail": f"Değerlendirme yapılamadı: {str(e)}"}, status=500)

        result_type = eval_result.get("result", "wrong")
        score_delta = eval_result.get("score_delta", 1 if result_type == "correct" else (-1 if result_type == "imperfect" else -2))

        # Puan güncelle
        new_scores = []
        for topic in topics:
            score_obj, _ = UserGrammarScore.objects.get_or_create(
                user=request.user, topic=topic
            )
            score_obj.score = max(0, min(10, score_obj.score + score_delta))
            score_obj.save()
            new_scores.append({
                "topic_id": topic.id,
                "topic_code": topic.code,
                "score": score_obj.score,
                "stage": score_obj.stage,
            })

        # Soru ilerlemesi
        progress_obj, _ = UserQuestionProgress.objects.get_or_create(
            user=request.user, question=question
        )
        progress_obj.attempts += 1
        if result_type == "correct":
            progress_obj.correct_count += 1
        progress_obj.save()

        return Response({
            "result": result_type,
            "score_delta": score_delta,
            "feedback": eval_result.get("feedback", ""),
            "correct_translation": eval_result.get("correct_translation") or question.reference_translation,
            "new_scores": new_scores,
            "mastered_this_question": progress_obj.correct_count >= 2,
        })


class GrammarLibraryStatsView(APIView):
    """Kullanıcının 84 gramer konusundaki genel ilerleme tablosunu döner."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        topics = GrammarTopic.objects.all()
        user_scores = dict(
            UserGrammarScore.objects.filter(user=request.user)
            .values_list("topic_id", "score")
        )

        counts = {
            "all": topics.count(),
            "unknown": 0,
            "learning": 0,
            "good": 0,
            "mastered": 0,
        }

        level_stats = {
            "A1": {"total": 0, "mastered": 0},
            "A2": {"total": 0, "mastered": 0},
            "B1": {"total": 0, "mastered": 0},
            "B2": {"total": 0, "mastered": 0},
            "C1": {"total": 0, "mastered": 0},
        }

        topic_list = []
        for t in topics:
            score = user_scores.get(t.id, 0)
            if score <= 0:
                stage = "unknown"
            elif score <= 5:
                stage = "learning"
            elif score <= 9:
                stage = "good"
            else:
                stage = "mastered"

            counts[stage] += 1
            if t.level in level_stats:
                level_stats[t.level]["total"] += 1
                if stage == "mastered":
                    level_stats[t.level]["mastered"] += 1

            topic_list.append({
                "id": t.id,
                "code": t.code,
                "level": t.level,
                "title": t.title,
                "turkish_description": t.turkish_description,
                "score": score,
                "stage": stage,
            })

        return Response({
            "counts": counts,
            "level_stats": level_stats,
            "topics": topic_list,
        })
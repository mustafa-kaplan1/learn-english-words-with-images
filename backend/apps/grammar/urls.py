from django.urls import path
from .views import (
    GrammarTopicsView,
    GrammarSessionStartView,
    GrammarSessionSubmitView,
    GrammarSessionSelfEvalView,
    GrammarQuestionReportView,
    GrammarLibraryStatsView,
)

app_name = "grammar"

urlpatterns = [
    path("topics/", GrammarTopicsView.as_view(), name="topics"),
    path("session/start/", GrammarSessionStartView.as_view(), name="session-start"),
    path("session/submit/", GrammarSessionSubmitView.as_view(), name="session-submit"),
    path("session/self-evaluate/", GrammarSessionSelfEvalView.as_view(), name="session-self-evaluate"),
    path("report/", GrammarQuestionReportView.as_view(), name="question-report"),
    path("library/", GrammarLibraryStatsView.as_view(), name="library-stats"),
]
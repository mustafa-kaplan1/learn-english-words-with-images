from django.urls import path
from .views import (
    GrammarTopicsView,
    GrammarSessionStartView,
    GrammarSessionSubmitView,
    GrammarLibraryStatsView,
)

app_name = "grammar"

urlpatterns = [
    path("topics/", GrammarTopicsView.as_view(), name="topics"),
    path("session/start/", GrammarSessionStartView.as_view(), name="session-start"),
    path("session/submit/", GrammarSessionSubmitView.as_view(), name="session-submit"),
    path("library/", GrammarLibraryStatsView.as_view(), name="library-stats"),
]

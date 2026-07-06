from django.urls import path
from .views import WordSessionView, ScoreUpdateView, WordImagesView, LibraryView, WordReportView

urlpatterns = [
    path("session/", WordSessionView.as_view(), name="word_session"),
    path("score/", ScoreUpdateView.as_view(), name="score_update"),
    path("images/<int:word_id>/", WordImagesView.as_view(), name="word_images"),
    path("library/", LibraryView.as_view(), name="library"),
        path("report/", WordReportView.as_view(), name="word_report"),
]
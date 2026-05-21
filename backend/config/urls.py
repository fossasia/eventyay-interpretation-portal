from __future__ import annotations

"""Root URL configuration."""

from pathlib import Path

from django.contrib import admin
from django.http import FileResponse, HttpResponse
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static

# Location of the built React SPA — served in production from Django.
_SPA_INDEX = Path(settings.BASE_DIR) / "frontend" / "dist" / "index.html"


def _spa_view(request, *args, **kwargs):
    """Serve the React SPA index for any unknown URL so client-side routing works."""
    if _SPA_INDEX.exists():
        return FileResponse(open(_SPA_INDEX, "rb"), content_type="text/html")
    # In development the Vite dev-server handles these URLs at :5173.
    return HttpResponse(
        "<h2>Frontend not built.</h2>"
        "<p>Run <code>cd frontend && npm run build</code> or use the Vite dev server at "
        "<a href='http://localhost:5173'>http://localhost:5173</a>.</p>",
        content_type="text/html",
        status=200,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    # Django AllAuth
    path("accounts/", include("allauth.urls")),
    # API v1
    path("api/auth/", include("apps.accounts.urls")),
    path("api/rooms/", include("apps.rooms.urls")),
    path("api/media/", include("apps.media_sources.urls")),
    path("api/streaming/", include("apps.streaming.urls")),
    path("api/invitations/", include("apps.invitations.urls")),
    path("api/notes/", include("apps.notes.urls")),
    # SPA catch-all — must be last so it never shadows API routes.
    re_path(r"^(?!api/|admin/|accounts/|ws/).*$", _spa_view, name="spa"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

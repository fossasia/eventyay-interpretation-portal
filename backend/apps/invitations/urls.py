from __future__ import annotations

from django.urls import path

from .views import InvitationAcceptView, InvitationListCreateView, InvitationRevokeView, InvitationValidateView

urlpatterns = [
    path("rooms/<slug:slug>/", InvitationListCreateView.as_view(), name="invitation-list-create"),
    path("rooms/<slug:slug>/<uuid:invitation_id>/", InvitationRevokeView.as_view(), name="invitation-revoke"),
    path("validate/<str:token>/", InvitationValidateView.as_view(), name="invitation-validate"),
    path("accept/<str:token>/", InvitationAcceptView.as_view(), name="invitation-accept"),
]

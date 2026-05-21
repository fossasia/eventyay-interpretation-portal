from __future__ import annotations

from django.urls import path

from .views import (
    RemoveParticipantView,
    RoomAssignRoleView,
    RoomDetailView,
    RoomJoinView,
    RoomLeaveView,
    RoomListCreateView,
    RoomMembersView,
    StageAddParticipantView,
    StageParticipantView,
    StageView,
)

urlpatterns = [
    path("", RoomListCreateView.as_view(), name="room-list-create"),
    path("<slug:slug>/", RoomDetailView.as_view(), name="room-detail"),
    path("<slug:slug>/join/", RoomJoinView.as_view(), name="room-join"),
    path("<slug:slug>/leave/", RoomLeaveView.as_view(), name="room-leave"),
    path("<slug:slug>/members/", RoomMembersView.as_view(), name="room-members"),
    path("<slug:slug>/members/<int:user_id>/role/", RoomAssignRoleView.as_view(), name="room-assign-role"),
    path("<slug:slug>/members/<int:user_id>/remove/", RemoveParticipantView.as_view(), name="room-remove-participant"),
    path("<slug:slug>/stage/", StageView.as_view(), name="stage-detail"),
    path("<slug:slug>/stage/add/", StageAddParticipantView.as_view(), name="stage-add"),
    path("<slug:slug>/stage/<int:user_id>/", StageParticipantView.as_view(), name="stage-participant"),
]

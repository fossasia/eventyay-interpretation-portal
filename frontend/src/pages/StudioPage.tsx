import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStudio } from '@/hooks/useStudio'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useAuth } from '@/context/AuthContext'
import { mediaApi } from '@/services/api'
import StageArea from '@/components/studio/StageArea'
import BackstageRow from '@/components/studio/BackstageRow'
import SidebarPanel from '@/components/studio/SidebarPanel'
import StreamControls from '@/components/studio/StreamControls'
import styles from './StudioPage.module.css'
export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const studio = useStudio(slug!)

  const {
    isMuted, cameraOff, isScreenSharing,
    startMedia, stopMedia, toggleMute, toggleCamera,
    startScreenShare, stopScreenShare,
  } = useWebRTC()

  const [mediaStarted, setMediaStarted] = useState(false)

  // Auto-start media (mic+cam) on first mic or camera button click
  async function ensureMediaStarted() {
    if (!mediaStarted) {
      await startMedia()
      setMediaStarted(true)
    }
  }
  async function handleMicClick() {
    if (!mediaStarted) { await ensureMediaStarted() } else { toggleMute() }
  }
  async function handleCameraClick() {
    if (!mediaStarted) { await ensureMediaStarted() } else { toggleCamera() }
  }
  function handleLeave() { stopMedia(); setMediaStarted(false); navigate('/') }

  // Light/dark mode — persisted to localStorage
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('studio-theme') as 'dark' | 'light') ?? 'dark'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : ''
    localStorage.setItem('studio-theme', theme)
  }, [theme])
  function toggleTheme() { setTheme((t) => t === 'dark' ? 'light' : 'dark') }

  // Derived set of overlay user IDs for BackstageRow
  const overlayUserIds = useMemo(
    () => new Set(studio.overlayParticipants.map((o) => o.userId)),
    [studio.overlayParticipants]
  )

  const canModerate = useMemo(
    () => ['room_creator', 'moderator'].includes(studio.membership?.role ?? ''),
    [studio.membership]
  )

  const stageUserIds = useMemo(
    () => new Set(studio.stage?.participants.map((p) => p.user) ?? []),
    [studio.stage]
  )

  const onlineUserIds = useMemo(
    () => new Set(studio.onlineUsers.map((u) => u.userId)),
    [studio.onlineUsers]
  )

  const handRaisedIds = useMemo(
    () => new Set(studio.onlineUsers.filter((u) => u.handRaised).map((u) => u.userId)),
    [studio.onlineUsers]
  )

  const streamStatus = studio.streamSession?.status ?? 'idle'
  const isLive = streamStatus === 'live'
  const isRecording = streamStatus === 'recording'

  const handleUploadMedia = useCallback(async (formData: FormData) => {
    if (!slug) return
    await mediaApi.upload(slug, formData)
  }, [slug])

  if (studio.isLoading) {
    return <div className={styles.loading}><span className="loading-spinner">Loading studio…</span></div>
  }
  if (!studio.room) {
    return <div className={styles.loading}><span>Room not found.</span></div>
  }

  return (
    <div className={styles.page}>
      {/* ================================================================
          TOP BAR — room name / live status / stream go-live
          ================================================================ */}
      <header className={styles.topbar}>
        <div className={styles.tbLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')} title="Dashboard">
            <span className={styles.brandMark}>⬛</span>
          </button>
          <span className={styles.roomName}>{studio.room.name}</span>
          {(isLive || isRecording) && (
            <span className={`${styles.liveChip} ${isLive ? styles.live : styles.recording}`}>
              {isLive ? '● LIVE' : '⏺ REC'}
            </span>
          )}
        </div>

        <div className={styles.tbCenter}>
          <StreamControls
            streamSession={studio.streamSession}
            canControl={canModerate}
            activeContent={studio.activeContent}
            liveContent={studio.liveContent}
            onStart={studio.startStream}
            onStop={studio.stopStream}
            onPushLive={studio.pushLive}
          />
        </div>

        <div className={styles.tbRight}>
          <button className={styles.iconBtn} onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <button className={styles.iconBtn} onClick={() => navigate('/')} title="Settings">⚙</button>
        </div>
      </header>

      {/* ================================================================
          BODY: stage + sidebar
          ================================================================ */}
      <div className={styles.body}>
        {/* Center column: stage → backstage strip → bottom toolbar */}
        <div className={styles.centerCol}>
          {/* Stage / preview area */}
          <div className={styles.stageWrapper}>
            <StageArea
              participants={studio.stage?.participants ?? []}
              members={studio.members}
              activeContent={studio.activeContent}
              liveContent={studio.liveContent}
              layout={studio.stage?.layout ?? 'grid'}
              canModerate={canModerate}
              scenes={studio.scenes}
              overlayParticipants={studio.overlayParticipants}
              activeAudioSource={studio.activeAudioSource}
              onRemove={studio.removeFromStage}
              onMute={studio.muteParticipant}
              onPin={studio.pinParticipant}
              onSpotlight={studio.spotlightParticipant}
              onActivateScene={studio.activateScene}
              onToggleOverlay={(uid) =>
                overlayUserIds.has(uid) ? studio.removeFromOverlay(uid) : studio.addToOverlay(uid)
              }
              onSetOverlayPosition={studio.setOverlayPosition}
            />
          </div>

          {/* Backstage strip — interpreter cards */}
          <div className={styles.backstageWrapper}>
            <BackstageRow
              members={studio.members}
              stageUserIds={stageUserIds}
              handRaisedIds={handRaisedIds}
              canModerate={canModerate}
              activeAudioSourceId={studio.activeAudioSource}
              overlayUserIds={overlayUserIds}
              onAddToStage={studio.addToStage}
              onRemoveFromStage={studio.removeFromStage}
              onMute={studio.muteParticipant}
              onRemove={studio.removeMember}
              onSetAudioSource={studio.setActiveAudioSource}
              onToggleOverlay={(uid) =>
                overlayUserIds.has(uid) ? studio.removeFromOverlay(uid) : studio.addToOverlay(uid)
              }
            />
          </div>

          {/* ============================================================
              BOTTOM TOOLBAR — StreamYard-style mic/cam/screen controls
              ============================================================ */}
          <div className={styles.bottomToolbar}>
            {/* Left group: mic, camera, screen share */}
            <div className={styles.toolGroup}>
              {/* Mic */}
              <button
                className={`${styles.toolBtn} ${mediaStarted && isMuted ? styles.toolBtnOff : ''}`}
                onClick={handleMicClick}
                title={!mediaStarted ? 'Start mic' : isMuted ? 'Unmute' : 'Mute'}
              >
                <span className={styles.toolIcon}>{mediaStarted && isMuted ? '🔇' : '🎙'}</span>
                <span className={styles.toolLabel}>{!mediaStarted ? 'Mic' : isMuted ? 'Unmuted' : 'Muted'}</span>
              </button>

              {/* Camera */}
              <button
                className={`${styles.toolBtn} ${mediaStarted && cameraOff ? styles.toolBtnOff : ''}`}
                onClick={handleCameraClick}
                title={!mediaStarted ? 'Start camera' : cameraOff ? 'Enable camera' : 'Disable camera'}
              >
                <span className={styles.toolIcon}>{mediaStarted && cameraOff ? '📷' : '📹'}</span>
                <span className={styles.toolLabel}>{!mediaStarted ? 'Camera' : cameraOff ? 'Off' : 'On'}</span>
              </button>

              {/* Screen share */}
              <button
                className={`${styles.toolBtn} ${isScreenSharing ? styles.toolBtnActive : ''}`}
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <span className={styles.toolIcon}>🖥</span>
                <span className={styles.toolLabel}>Screen</span>
              </button>
            </div>

            {/* Divider */}
            <div className={styles.toolDivider} />

            {/* Right group: raise hand (non-mods), settings, leave */}
            <div className={styles.toolGroup}>
              {!canModerate && (
                <button className={styles.toolBtn} onClick={() => studio.raiseHand()} title="Raise hand">
                  <span className={styles.toolIcon}>✋</span>
                  <span className={styles.toolLabel}>Raise hand</span>
                </button>
              )}
              <button
                className={`${styles.toolBtn} ${styles.toolBtnLeave}`}
                onClick={handleLeave}
                title="Leave studio"
              >
                <span className={styles.toolIcon}>→</span>
                <span className={styles.toolLabel}>Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <SidebarPanel
          {...studio}
          currentUserId={user?.id ?? 0}
          canModerate={canModerate}
          stageUserIds={stageUserIds}
          onlineUserIds={onlineUserIds}
          handRaisedIds={handRaisedIds}
          onUploadMedia={handleUploadMedia}
        />
      </div>
    </div>
  )
}

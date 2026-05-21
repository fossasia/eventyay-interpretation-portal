import type { StageParticipant, StageContent, Scene, RoomMembership, OverlayParticipant, OverlayPosition } from '@/types'
import styles from './StageArea.module.css'
import React from 'react'

interface Props {
  participants: StageParticipant[]
  members: RoomMembership[]
  activeContent: StageContent
  liveContent: StageContent
  layout: string
  canModerate: boolean
  scenes: Scene[]
  overlayParticipants: OverlayParticipant[]
  activeAudioSource: number | null
  onRemove: (userId: number) => void
  onMute: (userId: number, muted: boolean) => void
  onPin: (userId: number, pinned: boolean) => void
  onSpotlight: (userId: number, spotlighted: boolean) => void
  onActivateScene: (scene: Scene) => void
  onToggleOverlay: (userId: number) => void
  onSetOverlayPosition: (userId: number, pos: OverlayPosition) => void
}

const POSITION_CYCLE: OverlayPosition[] = ['br', 'bl', 'tr', 'tl', 'side']

function overlayStyle(pos: OverlayPosition, size: number): React.CSSProperties {
  const pct = `${Math.round(size * 100)}%`
  const base: React.CSSProperties = {
    position: 'absolute',
    width: pct,
    aspectRatio: '16/9',
    zIndex: 10,
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    overflow: 'hidden',
    background: '#111',
  }
  switch (pos) {
    case 'br': return { ...base, bottom: 12, right: 12 }
    case 'bl': return { ...base, bottom: 12, left: 12 }
    case 'tr': return { ...base, top: 12, right: 12 }
    case 'tl': return { ...base, top: 12, left: 12 }
    case 'side': return { ...base, right: 12, top: '50%', transform: 'translateY(-50%)' }
  }
}

export default function StageArea({
  participants, members, activeContent, liveContent, layout, canModerate,
  scenes, overlayParticipants, activeAudioSource,
  onRemove, onMute, onPin, onSpotlight, onActivateScene,
  onToggleOverlay, onSetOverlayPosition,
}: Props) {
  const isPreviewing = activeContent.type !== liveContent.type || activeContent.id !== liveContent.id
  const hasMediaBackground = activeContent.type !== 'participants' && activeContent.type !== 'scene'

  return (
    <div className={styles.wrapper}>
      {/* Preview label */}
      {isPreviewing && (
        <div className={styles.previewBadge}>PREVIEW</div>
      )}
      {!isPreviewing && liveContent.type !== 'participants' && (
        <div className={styles.liveBadge}>● LIVE</div>
      )}

      {/* Stage content */}
      <div className={styles.stage} style={{ position: 'relative' }}>
        {activeContent.type === 'participants' && (
          <ParticipantGrid
            participants={participants}
            layout={layout}
            canModerate={canModerate}
            onRemove={onRemove}
            onMute={onMute}
            onPin={onPin}
            onSpotlight={onSpotlight}
          />
        )}

        {activeContent.type === 'pdf' && activeContent.url && (
          <div className={styles.mediaFrame}>
            <iframe
              src={`${activeContent.url}#toolbar=0`}
              className={styles.pdfFrame}
              title={activeContent.title ?? 'PDF'}
            />
            <div className={styles.mediaLabel}>{activeContent.title}</div>
          </div>
        )}

        {activeContent.type === 'image' && activeContent.url && (
          <div className={styles.mediaFrame}>
            <img src={activeContent.url} alt={activeContent.title ?? ''} className={styles.imageViewer} />
          </div>
        )}

        {activeContent.type === 'video' && activeContent.url && (
          <div className={styles.mediaFrame}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={activeContent.url} controls autoPlay className={styles.videoPlayer} />
          </div>
        )}

        {activeContent.type === 'youtube' && activeContent.url && (
          <div className={styles.mediaFrame}>
            <iframe
              src={youtubeEmbedUrl(activeContent.url)}
              className={styles.youtubeFrame}
              title={activeContent.title ?? 'YouTube'}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        )}

        {activeContent.type === 'screen' && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>🖥</span>
            <span>Screen share will appear here</span>
          </div>
        )}

        {activeContent.type === 'scene' && (
          <SceneLayout
            sceneId={activeContent.id}
            participants={participants}
            canModerate={canModerate}
            onRemove={onRemove}
          />
        )}

        {/* PiP overlays — only shown when background is media */}
        {hasMediaBackground && overlayParticipants.map((ov) => {
          const member = members.find((m) => m.user === ov.userId)
          if (!member) return null
          const isAudioActive = activeAudioSource === ov.userId
          const nextPos = POSITION_CYCLE[(POSITION_CYCLE.indexOf(ov.position) + 1) % POSITION_CYCLE.length]
          return (
            <div key={ov.userId} style={overlayStyle(ov.position, ov.size)}>
              {/* Avatar / initials */}
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', fontSize: '2rem', color: '#fff' }}>
                {member.user_avatar
                  ? <img src={member.user_avatar} alt={member.user_display} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{initials(member.user_display)}</span>
                }
              </div>
              {/* Name + audio badge */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                {isAudioActive && <span title="Active audio source" style={{ color: '#2ecc71' }}>🎙</span>}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>{member.user_display}</span>
              </div>
              {/* Controls */}
              {canModerate && (
                <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2 }}>
                  <button
                    onClick={() => onSetOverlayPosition(ov.userId, nextPos)}
                    title="Move overlay"
                    style={{ fontSize: 10, padding: '1px 4px', background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: 3, border: 'none', cursor: 'pointer' }}
                  >⇄</button>
                  <button
                    onClick={() => onToggleOverlay(ov.userId)}
                    title="Remove overlay"
                    style={{ fontSize: 10, padding: '1px 4px', background: 'rgba(180,0,0,0.8)', color: '#fff', borderRadius: 3, border: 'none', cursor: 'pointer' }}
                  >✕</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Scene switcher strip — shown when no media is active */}
      {canModerate && (
        <div className={styles.sceneSwitcher}>
          {scenes.map((s) => (
            <button
              key={s.id}
              className={`${styles.sceneBtn} ${activeContent.type === 'scene' && activeContent.id === s.id ? styles.activeScene : ''}`}
              onClick={() => onActivateScene(s)}
              title={s.name}
            >
              {sceneIcon(s.layout)}
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface GridProps {
  participants: StageParticipant[]
  layout: string
  canModerate: boolean
  onRemove: (userId: number) => void
  onMute: (userId: number, muted: boolean) => void
  onPin: (userId: number, pinned: boolean) => void
  onSpotlight: (userId: number, spotlighted: boolean) => void
}

function ParticipantGrid({ participants, layout, canModerate, onRemove, onMute, onPin, onSpotlight }: GridProps) {
  if (participants.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🎬</span>
        <p>No one on stage yet</p>
        {canModerate && <p className={styles.hint}>Hover a card below → Add to stage</p>}
      </div>
    )
  }

  return (
    <div className={`${styles.grid} ${styles[`grid_${layout}`]}`}>
      {participants.map((p) => (
        <div
          key={p.id}
          className={`${styles.tile} ${p.is_spotlighted ? styles.spotlighted : ''} ${p.is_pinned ? styles.pinned : ''}`}
        >
          <div className={styles.tileVideo}>
            {p.user_avatar
              ? <img src={p.user_avatar} alt={p.user_display} />
              : <span className={styles.tileInitials}>{initials(p.user_display)}</span>
            }
          </div>
          <div className={styles.tileFooter}>
            <span className={styles.tileName}>{p.user_display}</span>
            <div className={styles.tileBadges}>
              {p.is_muted && <span title="Muted">🔇</span>}
              {p.camera_off && <span title="Camera off">📷</span>}
              {p.is_pinned && <span title="Pinned">📌</span>}
            </div>
          </div>
          {canModerate && (
            <div className={styles.tileActions}>
              <button onClick={() => onMute(p.user, !p.is_muted)} title={p.is_muted ? 'Unmute' : 'Mute'}>
                {p.is_muted ? '🔊' : '🔇'}
              </button>
              <button onClick={() => onPin(p.user, !p.is_pinned)} title={p.is_pinned ? 'Unpin' : 'Pin'}>
                📌
              </button>
              <button onClick={() => onSpotlight(p.user, !p.is_spotlighted)} title="Spotlight">★</button>
              <button onClick={() => onRemove(p.user)} title="Remove" className={styles.removeBtn}>✕</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SceneLayout({
  sceneId, participants, canModerate, onRemove,
}: { sceneId: string | null; participants: StageParticipant[]; canModerate: boolean; onRemove: (id: number) => void }) {
  const first = participants[0]

  if (sceneId === 'split') {
    return (
      <div className={styles.sceneSplit}>
        <div className={styles.sceneLeft}>
          <div className={styles.placeholder}><span>Slides / Media</span></div>
        </div>
        <div className={styles.sceneRight}>
          {first
            ? <TileMini p={first} canModerate={canModerate} onRemove={onRemove} />
            : <div className={styles.placeholder}><span>Waiting for speaker</span></div>
          }
        </div>
      </div>
    )
  }

  if (sceneId === 'pip') {
    return (
      <div className={styles.scenePip}>
        <div className={styles.pipMain}><div className={styles.placeholder}><span>Screen Share</span></div></div>
        {first && <div className={styles.pipCorner}><TileMini p={first} canModerate={canModerate} onRemove={onRemove} /></div>}
      </div>
    )
  }

  if (sceneId === 'fullscreen') {
    return <div className={styles.placeholder}><span className={styles.placeholderIcon}>🖼</span><span>Full-screen media</span></div>
  }

  // default: grid
  return (
    <div className={`${styles.grid} ${styles.grid_grid}`}>
      {participants.map((p) => (
        <TileMini key={p.id} p={p} canModerate={canModerate} onRemove={onRemove} />
      ))}
    </div>
  )
}

function TileMini({ p, canModerate, onRemove }: { p: StageParticipant; canModerate: boolean; onRemove: (id: number) => void }) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileVideo}>
        {p.user_avatar
          ? <img src={p.user_avatar} alt={p.user_display} />
          : <span className={styles.tileInitials}>{initials(p.user_display)}</span>
        }
      </div>
      <div className={styles.tileFooter}>
        <span className={styles.tileName}>{p.user_display}</span>
      </div>
      {canModerate && (
        <div className={styles.tileActions}>
          <button onClick={() => onRemove(p.user)} title="Remove" className={styles.removeBtn}>✕</button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function initials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function youtubeEmbedUrl(url: string): string {
  // Handle various YouTube URL formats
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  const id = match?.[1]
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url
}

function sceneIcon(layout: string): string {
  const icons: Record<string, string> = { grid: '⊞', split: '⊟', fullscreen: '⊡', pip: '▣' }
  return icons[layout] ?? '⊞'
}

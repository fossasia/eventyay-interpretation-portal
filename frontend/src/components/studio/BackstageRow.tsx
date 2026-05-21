import type { RoomMembership } from '@/types'
import styles from './BackstageRow.module.css'

interface Props {
  members: RoomMembership[]
  stageUserIds: Set<number>
  handRaisedIds: Set<number>
  canModerate: boolean
  activeAudioSourceId: number | null
  overlayUserIds: Set<number>
  onAddToStage: (userId: number) => void
  onRemoveFromStage: (userId: number) => void
  onMute: (userId: number, muted: boolean) => void
  onRemove: (userId: number) => void
  onSetAudioSource: (userId: number | null) => void
  onToggleOverlay: (userId: number) => void
  onInvite?: () => void
}

export default function BackstageRow({
  members, stageUserIds, handRaisedIds, canModerate,
  activeAudioSourceId, overlayUserIds,
  onAddToStage, onRemoveFromStage, onMute, onRemove,
  onSetAudioSource, onToggleOverlay, onInvite,
}: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>BACKSTAGE</div>
      <div className={styles.strip}>
        {members.map((m) => {
          const isOnStage = stageUserIds.has(m.user)
          const handRaised = handRaisedIds.has(m.user)
          const isAudioSource = activeAudioSourceId === m.user
          const isOverlay = overlayUserIds.has(m.user)
          return (
            <Card
              key={m.id}
              membership={m}
              isOnStage={isOnStage}
              handRaised={handRaised}
              isAudioSource={isAudioSource}
              isOverlay={isOverlay}
              canModerate={canModerate}
              onAddToStage={onAddToStage}
              onRemoveFromStage={onRemoveFromStage}
              onMute={onMute}
              onRemove={onRemove}
              onSetAudioSource={onSetAudioSource}
              onToggleOverlay={onToggleOverlay}
            />
          )
        })}
        {/* Always show the "Present or invite" placeholder card */}
        <button className={styles.inviteCard} onClick={onInvite} title="Present media or invite participants">
          <span className={styles.inviteIcons}>
            <span className={styles.inviteIcon}>🖥</span>
            <span className={styles.inviteIcon}>👤</span>
          </span>
          <span className={styles.inviteLabel}>Present or invite</span>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual backstage card — StreamYard hover overlay style
// ---------------------------------------------------------------------------
interface CardProps {
  membership: RoomMembership
  isOnStage: boolean
  handRaised: boolean
  isAudioSource: boolean
  isOverlay: boolean
  canModerate: boolean
  onAddToStage: (userId: number) => void
  onRemoveFromStage: (userId: number) => void
  onMute: (userId: number, muted: boolean) => void
  onRemove: (userId: number) => void
  onSetAudioSource: (userId: number | null) => void
  onToggleOverlay: (userId: number) => void
}

function Card({
  membership, isOnStage, handRaised, isAudioSource, isOverlay,
  canModerate, onAddToStage, onRemoveFromStage, onMute, onRemove,
  onSetAudioSource, onToggleOverlay,
}: CardProps) {
  return (
    <div className={`${styles.card} ${isOnStage ? styles.onStage : ''} ${isAudioSource ? styles.audioActive : ''}`}>
      {/* Thumbnail / avatar */}
      <div className={styles.thumb}>
        {membership.user_avatar
          ? <img src={membership.user_avatar} alt={membership.user_display} />
          : <span className={styles.initials}>{initials(membership.user_display)}</span>
        }
        {handRaised && <span className={styles.handBadge}>✋</span>}
        {isOnStage && <span className={styles.stageDot} title="On stage" />}

        {/* Hover overlay — moderator controls (shown on card hover) */}
        {canModerate && (
          <div className={styles.overlay}>
            {isOnStage ? (
              <button
                className={styles.stageBtn + ' ' + styles.removeStageBtn}
                onClick={() => onRemoveFromStage(membership.user)}
              >
                Remove
              </button>
            ) : (
              <button
                className={styles.stageBtn + ' ' + styles.addStageBtn}
                onClick={() => onAddToStage(membership.user)}
              >
                Add to stage
              </button>
            )}
            <div className={styles.minorActions}>
              <button onClick={() => onMute(membership.user, true)} title="Mute">🔇</button>
              <button
                onClick={() => onSetAudioSource(isAudioSource ? null : membership.user)}
                title={isAudioSource ? 'Clear audio source' : 'Set as audio source'}
                className={isAudioSource ? styles.audioActiveBtn : ''}
              >🎙</button>
              <button
                onClick={() => onToggleOverlay(membership.user)}
                title={isOverlay ? 'Remove PiP overlay' : 'Add as PiP overlay'}
                className={isOverlay ? styles.overlayActiveBtn : ''}
              >⊡</button>
              <button onClick={() => onRemove(membership.user)} title="Remove from room" className={styles.dangerBtn}>✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Always-visible footer: mic icon + name */}
      <div className={styles.cardFooter}>
        <span className={`${styles.micIcon} ${isAudioSource ? styles.micActive : ''}`} title={isAudioSource ? 'Active audio' : 'Mic'}>
          🎙
        </span>
        <span className={styles.name}>{membership.user_display}</span>
        {canModerate && <span className={styles.menuDots}>⋮</span>}
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

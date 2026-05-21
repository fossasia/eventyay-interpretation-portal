import { useState } from 'react'
import type { RoomMembership } from '@/types'
import styles from './ParticipantCard.module.css'

interface Props {
  membership: RoomMembership
  isOnStage: boolean
  handRaised: boolean
  canModerate: boolean
  onAddToStage: (userId: number) => void
  onRemoveFromStage: (userId: number) => void
  onMute: (userId: number, muted: boolean) => void
  onAssignRole: (userId: number, role: string) => void
  onRemove: (userId: number) => void
}

export default function ParticipantCard({
  membership, isOnStage, handRaised, canModerate,
  onAddToStage, onRemoveFromStage, onMute, onAssignRole, onRemove,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={`${styles.card} ${isOnStage ? styles.onStage : ''}`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className={styles.videoArea}>
        {membership.user_avatar
          ? <img src={membership.user_avatar} alt={membership.user_display} className={styles.avatar} />
          : <span className={styles.initials}>{initials(membership.user_display)}</span>
        }
        {handRaised && <span className={styles.handBadge} title="Hand raised">✋</span>}
      </div>

      <div className={styles.info}>
        <span className={styles.name}>{membership.user_display}</span>
        <span className={styles.role}>{formatRole(membership.role)}</span>
      </div>

      {/* Hover overlay — StreamYard style */}
      {canModerate && (
        <div className={styles.overlay}>
          {!isOnStage ? (
            <button className={styles.addToStageBtn} onClick={() => onAddToStage(membership.user)}>
              Add to stage
            </button>
          ) : (
            <button className={styles.removeFromStageBtn} onClick={() => onRemoveFromStage(membership.user)}>
              Remove from stage
            </button>
          )}

          <button className={styles.moreBtn} onClick={() => setShowMenu((v) => !v)}>⋮</button>

          {showMenu && (
            <div className={styles.menu}>
              <button onClick={() => { onMute(membership.user, true); setShowMenu(false) }}>Mute</button>
              <button onClick={() => { onAssignRole(membership.user, 'moderator'); setShowMenu(false) }}>
                Make moderator
              </button>
              <button onClick={() => { onRemove(membership.user); setShowMenu(false) }} className={styles.danger}>
                Remove from room
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatRole(role: string): string {
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

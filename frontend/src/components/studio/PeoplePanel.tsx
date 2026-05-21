import type { RoomMembership } from '@/types'
import ParticipantCard from './ParticipantCard'
import styles from './PeoplePanel.module.css'

interface Props {
  members: RoomMembership[]
  onlineUserIds: Set<number>
  handRaisedIds: Set<number>
  stageUserIds: Set<number>
  canModerate: boolean
  onAddToStage: (userId: number) => void
  onRemoveFromStage: (userId: number) => void
  onMute: (userId: number, muted: boolean) => void
  onAssignRole: (userId: number, role: string) => void
  onRemove: (userId: number) => void
}

export default function PeoplePanel({
  members, onlineUserIds, handRaisedIds, stageUserIds, canModerate,
  onAddToStage, onRemoveFromStage, onMute, onAssignRole, onRemove,
}: Props) {
  const online = members.filter((m) => onlineUserIds.has(m.user))
  const offline = members.filter((m) => !onlineUserIds.has(m.user))

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>People ({members.length})</h3>

      {online.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>Online ({online.length})</p>
          <div className={styles.grid}>
            {online.map((m) => (
              <ParticipantCard
                key={m.id}
                membership={m}
                isOnStage={stageUserIds.has(m.user)}
                handRaised={handRaisedIds.has(m.user)}
                canModerate={canModerate}
                onAddToStage={onAddToStage}
                onRemoveFromStage={onRemoveFromStage}
                onMute={onMute}
                onAssignRole={onAssignRole}
                onRemove={onRemove}
              />
            ))}
          </div>
        </section>
      )}

      {offline.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>Offline ({offline.length})</p>
          <div className={styles.grid}>
            {offline.map((m) => (
              <ParticipantCard
                key={m.id}
                membership={m}
                isOnStage={false}
                handRaised={false}
                canModerate={false}
                onAddToStage={() => {}}
                onRemoveFromStage={() => {}}
                onMute={() => {}}
                onAssignRole={() => {}}
                onRemove={() => {}}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

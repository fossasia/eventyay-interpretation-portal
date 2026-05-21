import { useState, useCallback } from 'react'
import ChatPanel from './ChatPanel'
import MediaAssetsPanel from './MediaAssetsPanel'
import PeoplePanel from './PeoplePanel'
import NotesPanel from './NotesPanel'
import type { useStudio } from '@/hooks/useStudio'
import styles from './SidebarPanel.module.css'

type SidebarTab = 'chat' | 'media' | 'people' | 'notes' | 'invitations'
type StudioState = ReturnType<typeof useStudio>

interface Props extends StudioState {
  currentUserId: number
  canModerate: boolean
  stageUserIds: Set<number>
  onlineUserIds: Set<number>
  handRaisedIds: Set<number>
  onUploadMedia: (formData: FormData) => void
}

const TABS: Array<{ id: SidebarTab; icon: string; label: string; modOnly?: boolean }> = [
  { id: 'chat',        icon: '💬', label: 'Chat' },
  { id: 'media',       icon: '🖼', label: 'Media' },
  { id: 'people',      icon: '👥', label: 'People' },
  { id: 'notes',       icon: '📝', label: 'Notes' },
  { id: 'invitations', icon: '🔗', label: 'Invite', modOnly: true },
]

export default function SidebarPanel(props: Props) {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>('chat')

  const handleTab = useCallback((id: SidebarTab) => {
    setActiveTab((prev) => (prev === id ? null : id))
  }, [])

  const visibleTabs = TABS.filter((t) => !t.modOnly || props.canModerate)

  return (
    <aside className={`${styles.sidebar} ${activeTab ? styles.expanded : styles.collapsed}`}>
      {/* Icon rail */}
      <nav className={styles.rail}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`${styles.railBtn} ${activeTab === t.id ? styles.active : ''}`}
            onClick={() => handleTab(t.id)}
            title={t.label}
            aria-label={t.label}
          >
            <span className={styles.railIcon}>{t.icon}</span>
          </button>
        ))}
      </nav>

      {/* Panel content */}
      {activeTab && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              {visibleTabs.find((t) => t.id === activeTab)?.label}
            </span>
            <button className={styles.closeBtn} onClick={() => setActiveTab(null)} title="Close">✕</button>
          </div>
          <div className={styles.panelBody}>
            {activeTab === 'chat' && (
              <ChatPanel
                messages={props.chatMessages}
                onSend={props.sendChat}
                currentUserId={props.currentUserId}
              />
            )}
            {activeTab === 'media' && (
              <MediaAssetsPanel
                items={props.mediaItems}
                canManage={props.canModerate}
                activeContent={props.activeContent}
                onPresent={props.presentMedia}
                onDelete={(id) => {
                  if (props.room) {
                    import('@/services/api').then(({ mediaApi }) =>
                      mediaApi.delete(props.room!.slug, id).catch(() => {})
                    )
                  }
                }}
                onUpload={props.onUploadMedia}
              />
            )}
            {activeTab === 'people' && (
              <PeoplePanel
                members={props.members}
                onlineUserIds={props.onlineUserIds}
                handRaisedIds={props.handRaisedIds}
                stageUserIds={props.stageUserIds}
                canModerate={props.canModerate}
                onAddToStage={props.addToStage}
                onRemoveFromStage={props.removeFromStage}
                onMute={props.muteParticipant}
                onAssignRole={(userId, role) => props.assignRole(userId, role as 'moderator' | 'participant')}
                onRemove={props.removeMember}
              />
            )}
            {activeTab === 'notes' && (
              <NotesPanel note={props.note} onUpdate={props.updateNote} />
            )}
            {activeTab === 'invitations' && props.canModerate && (
              <InvitationsPanel
                invitations={props.invitations}
                onCreate={props.createInvitation}
                onRevoke={props.revokeInvitation}
              />
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Inline invitations panel (unchanged logic, new compact styling)
// ---------------------------------------------------------------------------
import { useState as useLocalState } from 'react'
import type { Invitation } from '@/types'

interface InvPanelProps {
  invitations: Invitation[]
  onCreate: (data: { role: string; max_uses?: number }) => Promise<Invitation>
  onRevoke: (id: string) => Promise<void>
}

function InvitationsPanel({ invitations, onCreate, onRevoke }: InvPanelProps) {
  const [role, setRole] = useLocalState<string>('participant')
  const [creating, setCreating] = useLocalState(false)

  async function handleCreate() {
    setCreating(true)
    try { await onCreate({ role }) } finally { setCreating(false) }
  }

  return (
    <div className={styles.invPanel}>
      <div className={styles.invCreate}>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.invSelect}>
          <option value="participant">Participant</option>
          <option value="moderator">Moderator</option>
          <option value="viewer">Viewer</option>
        </select>
        <button className={styles.invCreateBtn} onClick={handleCreate} disabled={creating}>
          {creating ? '…' : '+ Create link'}
        </button>
      </div>
      <div className={styles.invList}>
        {invitations.filter((i) => i.is_valid).map((inv) => (
          <div key={inv.id} className={styles.invItem}>
            <div className={styles.invInfo}>
              <span className={styles.invRole}>{inv.role}</span>
              <span className={styles.invUses}>{inv.use_count}{inv.max_uses ? `/${inv.max_uses}` : ''} uses</span>
            </div>
            <div className={styles.invUrl}>{inv.invite_url}</div>
            <div className={styles.invActions}>
              <button
                onClick={() => navigator.clipboard.writeText(inv.invite_url)}
                className={styles.copyBtn}
              >Copy</button>
              <button onClick={() => onRevoke(inv.id)} className={styles.revokeBtn}>Revoke</button>
            </div>
          </div>
        ))}
        {invitations.filter((i) => i.is_valid).length === 0 && (
          <p className={styles.invEmpty}>No active invite links.</p>
        )}
      </div>
    </div>
  )
}

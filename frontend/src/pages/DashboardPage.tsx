import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { roomsApi } from '@/services/api'
import type { Room } from '@/types'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    roomsApi.list().then(setRooms).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreating(true)
    try {
      const room = await roomsApi.create({ name: newRoomName.trim() })
      setRooms((prev) => [room, ...prev])
      setNewRoomName('')
      setShowCreate(false)
      navigate(`/studio/${room.slug}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Eventyay Studio</h1>
        <div className={styles.userBar}>
          <span>{user?.display_name || user?.username}</span>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <h2>Your Studios</h2>
          <button className={styles.createBtn} onClick={() => setShowCreate((v) => !v)}>
            + Create studio
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className={styles.createForm}>
            <input
              className={styles.input}
              placeholder="Studio name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              required
            />
            <button type="submit" className={styles.createSubmitBtn} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </form>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : rooms.length === 0 ? (
          <p className={styles.empty}>No studios yet. Create your first one!</p>
        ) : (
          <div className={styles.grid}>
            {rooms.map((room) => (
              <div
                key={room.id}
                className={styles.roomCard}
                onClick={() => navigate(`/studio/${room.slug}`)}
              >
                <h3 className={styles.roomName}>{room.name}</h3>
                <p className={styles.roomMeta}>
                  {room.member_count} members · {room.default_layout}
                </p>
                {room.description && <p className={styles.roomDesc}>{room.description}</p>}
                <button className={styles.enterBtn}>Enter studio →</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

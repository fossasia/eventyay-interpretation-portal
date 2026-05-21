import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { invitationsApi } from '@/services/api'
import styles from './AuthPage.module.css'

type Status = 'loading' | 'preview' | 'accepting' | 'success' | 'error'

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomSlug, setRoomSlug] = useState('')
  const [role, setRole] = useState('')

  // Phase 1: validate the token without accepting (public, no auth needed)
  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid invite link.'); return }
    invitationsApi
      .validate(token)
      .then((res) => {
        setRoomName(res.room_name)
        setRoomSlug(res.room_slug)
        setRole(res.role)
        setStatus('preview')
      })
      .catch(() => {
        setStatus('error')
        setMessage('This invitation is no longer valid or has expired.')
      })
  }, [token])

  // Phase 2: user clicks "Accept" — must be logged in
  async function handleAccept() {
    if (!user) {
      navigate(`/login?next=/join/${token}`)
      return
    }
    setStatus('accepting')
    try {
      const res = await invitationsApi.accept(token!)
      setMessage(res.detail)
      setRoomSlug(res.room_slug)
      setStatus('success')
    } catch {
      setStatus('error')
      setMessage('Failed to accept invitation. It may have already been used.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.logo}>Eventyay Studio</h1>

        {status === 'loading' && <p className={styles.muted}>Checking invite link…</p>}

        {status === 'preview' && (
          <>
            <p className={styles.inviteRoomName}>{roomName}</p>
            <p className={styles.inviteRole}>You're invited as <strong>{role}</strong></p>
            {user ? (
              <button className={styles.submitBtn} onClick={handleAccept}>
                Join studio →
              </button>
            ) : (
              <>
                <p className={styles.muted}>You must be signed in to join.</p>
                <button
                  className={styles.submitBtn}
                  onClick={() => navigate(`/login?next=/join/${token}`)}
                >
                  Sign in to join →
                </button>
              </>
            )}
          </>
        )}

        {status === 'accepting' && <p className={styles.muted}>Joining…</p>}

        {status === 'success' && (
          <>
            <p className={styles.success}>Joined successfully!</p>
            <button className={styles.submitBtn} onClick={() => navigate(`/studio/${roomSlug}`)}>
              Enter studio →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className={styles.error}>{message}</p>
            <button className={styles.submitBtn} onClick={() => navigate('/')}>Go to dashboard</button>
          </>
        )}
      </div>
    </div>
  )
}

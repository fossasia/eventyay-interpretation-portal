import { useState } from 'react'
import type { StreamSession, StageContent } from '@/types'
import styles from './StreamControls.module.css'

interface Props {
  streamSession: { status: string } | StreamSession | null
  canControl: boolean
  activeContent: StageContent
  liveContent: StageContent
  onStart: (data: { destination: string; stream_key?: string; youtube_stream_url?: string }) => Promise<unknown>
  onStop: () => Promise<void>
  onPushLive: () => void
}

export default function StreamControls({ streamSession, canControl, activeContent, liveContent, onStart, onStop, onPushLive }: Props) {
  const [showConfig, setShowConfig] = useState(false)
  const [destination, setDestination] = useState<'local' | 'youtube'>('local')
  const [streamKey, setStreamKey] = useState('')
  const [streamUrl, setStreamUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const status = streamSession?.status ?? 'idle'
  const isActive = status === 'live' || status === 'recording'

  async function handleStart() {
    setLoading(true)
    try {
      await onStart({
        destination,
        stream_key: destination === 'youtube' ? streamKey : undefined,
        youtube_stream_url: destination === 'youtube' ? streamUrl : undefined,
      })
      setShowConfig(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleStop() {
    setLoading(true)
    try {
      await onStop()
    } finally {
      setLoading(false)
    }
  }

  const isPreviewing = activeContent.type !== liveContent.type || activeContent.id !== liveContent.id

  if (!canControl) {
    return (
      <div className={styles.statusBar}>
        {isActive && <span className={styles.liveIndicator}>{status === 'live' ? '🔴 LIVE' : '⏺ Recording'}</span>}
      </div>
    )
  }

  return (
    <div className={styles.controls}>
      {/* Push-to-live when preview differs from live */}
      {isPreviewing && !isActive && (
        <button className={styles.pushLiveBtn} onClick={onPushLive}>
          Push Live ↑
        </button>
      )}

      {isActive ? (
        <button className={styles.stopBtn} onClick={handleStop} disabled={loading}>
          {loading ? 'Stopping…' : status === 'live' ? '⏹ End Live' : '⏹ Stop Recording'}
        </button>
      ) : (
        <button
          className={styles.goLiveBtn}
          onClick={() => setShowConfig((v) => !v)}
          disabled={loading}
        >
          To record or go live
        </button>
      )}

      {isActive && (
        <span className={styles.liveIndicator}>{status === 'live' ? '🔴 LIVE' : '⏺ REC'}</span>
      )}

      {showConfig && !isActive && (
        <div className={styles.configPanel}>
          <h4>Start Broadcast</h4>
          <div className={styles.row}>
            <label>
              <input type="radio" value="local" checked={destination === 'local'} onChange={() => setDestination('local')} />
              {' '}Record locally
            </label>
            <label>
              <input type="radio" value="youtube" checked={destination === 'youtube'} onChange={() => setDestination('youtube')} />
              {' '}YouTube Live
            </label>
          </div>
          {destination === 'youtube' && (
            <>
              <input
                className={styles.field}
                placeholder="YouTube stream key"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
              />
              <input
                className={styles.field}
                placeholder="YouTube RTMP URL"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
            </>
          )}
          <div className={styles.configActions}>
            <button className={styles.startBtn} onClick={handleStart} disabled={loading}>
              {loading ? 'Starting…' : 'Start'}
            </button>
            <button className={styles.cancelBtn} onClick={() => setShowConfig(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import type { ChatMessage } from '@/hooks/useStudio'
import styles from './ChatPanel.module.css'

interface Props {
  messages: ChatMessage[]
  onSend: (body: string) => void
  currentUserId: number
}

export default function ChatPanel({ messages, onSend, currentUserId }: Props) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const body = draft.trim()
    if (!body) return
    onSend(body)
    setDraft('')
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>Chat</h3>
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.message} ${m.userId === currentUserId ? styles.own : ''}`}>
            <span className={styles.sender}>{m.userId === currentUserId ? 'You' : m.displayName}</span>
            <span className={styles.body}>{m.body}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          placeholder="Send a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button className={styles.sendBtn} onClick={submit} disabled={!draft.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}

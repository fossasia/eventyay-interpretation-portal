import { useRef } from 'react'
import type { RoomNote } from '@/types'
import styles from './NotesPanel.module.css'

interface Props {
  note: RoomNote | null
  onUpdate: (content: string) => void
}

export default function NotesPanel({ note, onUpdate }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onUpdate(content), 800)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.heading}>Notes</h3>
        {note?.updated_at && (
          <span className={styles.timestamp}>
            Saved {new Date(note.updated_at).toLocaleTimeString()}
          </span>
        )}
      </div>
      <textarea
        className={styles.editor}
        defaultValue={note?.content ?? ''}
        key={note?.id}
        onChange={handleChange}
        placeholder="Start taking notes… Changes auto-save."
      />
    </div>
  )
}

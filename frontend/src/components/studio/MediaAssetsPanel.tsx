import type { MediaSource, StageContent } from '@/types'
import styles from './MediaAssetsPanel.module.css'

const ICONS: Record<string, string> = {
  pdf: '📄',
  slides: '🖼',
  image: '🖼',
  video: '🎬',
  youtube: '▶️',
  screen: '🖥',
  webcam: '📹',
}

interface Props {
  items: MediaSource[]
  canManage: boolean
  activeContent: StageContent
  onPresent: (item: MediaSource) => void
  onDelete: (id: string) => void
  onUpload: (formData: FormData) => void
}

export default function MediaAssetsPanel({ items, canManage, activeContent, onPresent, onDelete, onUpload }: Props) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', file.name)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const typeMap: Record<string, string> = {
      pdf: 'pdf', pptx: 'slides', ppt: 'slides',
      png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
      mp4: 'video', webm: 'video', mov: 'video',
    }
    fd.append('source_type', typeMap[ext] ?? 'video')
    onUpload(fd)
    e.target.value = ''
  }

  return (
    <div className={styles.panel}>
      {canManage && (
        <div className={styles.uploadRow}>
          <label className={styles.uploadBtn}>
            + Add media
            <input type="file" hidden accept="image/*,video/*,.pdf,.pptx,.ppt" onChange={handleFileChange} />
          </label>
        </div>
      )}

      <div className={styles.list}>
        {items.length === 0 && <p className={styles.empty}>No media assets yet.</p>}
        {items.map((item) => {
          const isOnStage = activeContent.id === item.id
          return (
            <div key={item.id} className={`${styles.item} ${isOnStage ? styles.onStage : ''}`}>
              <span className={styles.icon}>{ICONS[item.source_type] ?? '📁'}</span>
              <div className={styles.info}>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.type}>{item.source_type}</span>
              </div>
              {canManage && (
                <div className={styles.actions}>
                  {isOnStage
                    ? <span className={styles.stageBadge}>On stage</span>
                    : (
                      <button
                        className={styles.presentBtn}
                        onClick={() => onPresent(item)}
                        title="Present to stage"
                      >
                        Present
                      </button>
                    )
                  }
                  <button className={styles.deleteBtn} onClick={() => onDelete(item.id)} title="Remove">✕</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', display_name: '', password: '', password_confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err: unknown) {
      const data = (err as { data?: Record<string, unknown> }).data
      if (data) {
        const msgs = Object.values(data).flat().join(' ')
        setError(msgs || 'Registration failed.')
      } else {
        setError((err as { message?: string }).message ?? 'Registration failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.logo}>Eventyay Studio</h1>
        <h2 className={styles.heading}>Create account</h2>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {(['username', 'email', 'display_name', 'password', 'password_confirm'] as const).map((field) => (
            <label key={field} className={styles.label}>
              {field.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              <input
                type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                className={styles.input}
                value={form[field]}
                onChange={set(field)}
                required={field !== 'display_name'}
              />
            </label>
          ))}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

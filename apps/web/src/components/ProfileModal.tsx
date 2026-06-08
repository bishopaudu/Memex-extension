import { useState, useEffect } from 'react'
import { profileApi } from '../lib/api'
import { useToast } from './Toast'

interface Props {
  user:     { 
    id: string; 
    email: string; 
    //name?: string;
   // username?: string
     name?: string | null
    username?: string | null
   }
  onClose:  () => void
  onUpdate: (user: any) => void
}

type Tab = 'profile' | 'password' | 'stats'

export function ProfileModal({ user, onClose, onUpdate }: Props) {
  const { toast } = useToast()

  const [tab,          setTab]          = useState<Tab>('profile')
  const [name,         setName]         = useState(user.name ?? '')
  const [username,     setUsername]     = useState(user.username ?? '')
  const [saving,       setSaving]       = useState(false)
  const [avatarUrl,    setAvatarUrl]    = useState(user.avatarUrl ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [stats,        setStats]        = useState<any | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Password change
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [pwSaving,   setPwSaving]   = useState(false)

  useEffect(() => {
    if (tab === 'stats' && !stats) fetchStats()
  }, [tab])

  async function fetchStats() {
    setStatsLoading(true)
    const r = await profileApi.getStats()
    if (!r.error) setStats(r.data)
    setStatsLoading(false)
  }

  async function handleSaveProfile() {
    setSaving(true)
    const r = await profileApi.updateProfile({ name, username })
    if (r.error) {
      toast(r.error.message, 'error')
    } else {
      onUpdate(r.data.user)
      toast('Profile updated', 'success', '✅')
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    if (newPw !== confirmPw) {
      toast('Passwords do not match', 'error')
      return
    }
    if (newPw.length < 8) {
      toast('Password must be at least 8 characters', 'error')
      return
    }
    setPwSaving(true)
    const r = await profileApi.changePassword(currentPw, newPw)
    if (r.error) {
      toast(r.error.message, 'error')
    } else {
      toast('Password changed successfully', 'success', '🔐')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    }
    setPwSaving(false)
  }

  const initial = (user.name || user.email)[0].toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-2 border border-surface-4
                   rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-surface-4">
          <div className="flex items-center gap-3">
            {/* Avatar — click to upload */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-brand/20
                              flex items-center justify-center cursor-pointer
                              hover:opacity-80 transition-opacity"
                   onClick={() => document.getElementById('avatar-input')?.click()}
                   title="Click to change photo"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar"
                       className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base font-bold text-brand-bright">
                    {initial}
                  </span>
                )}
              </div>
              {/* Upload indicator */}
              {avatarUploading ? (
                <div className="absolute inset-0 rounded-full bg-black/50
                                flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent
                                  rounded-full animate-spin" />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full
                                bg-brand flex items-center justify-center
                                cursor-pointer border-2 border-surface-2"
                     onClick={() => document.getElementById('avatar-input')?.click()}>
                  <svg className="w-2.5 h-2.5 text-white" fill="none"
                       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </div>
              )}
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  // Validate size (max 5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    toast('Image must be under 5MB', 'error')
                    return
                  }

                  setAvatarUploading(true)
                  try {
                    // Read as base64
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader()
                      reader.onload  = () => resolve(reader.result as string)
                      reader.onerror = reject
                      reader.readAsDataURL(file)
                    })

                    const r = await profileApi.uploadAvatar(dataUrl)
                    if (r.error) {
                      toast(r.error.message, 'error')
                    } else {
                      setAvatarUrl(r.data.avatarUrl)
                      onUpdate({ ...user, avatarUrl: r.data.avatarUrl })
                      toast('Profile photo updated', 'success', '📸')
                    }
                  } catch {
                    toast('Upload failed', 'error')
                  }
                  setAvatarUploading(false)
                  // Reset input so same file can be re-selected
                  e.target.value = ''
                }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-1">
                {user.name || 'Your profile'}
              </p>
              <p className="text-[11px] text-ink-4">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       text-ink-4 hover:text-ink-1 hover:bg-surface-3
                       transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6"  x2="6"  y2="18"/>
              <line x1="6"  y1="6"  x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-4">
          {([
            { key: 'profile',  label: '👤 Profile'  },
            { key: 'stats',    label: '📊 Stats'    },
            { key: 'password', label: '🔐 Password' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative
                          ${tab === t.key
                            ? 'text-brand-bright'
                            : 'text-ink-4 hover:text-ink-2'}`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">

          {/* ── PROFILE TAB ── */}
          {tab === 'profile' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-medium text-ink-4
                                   uppercase tracking-wider mb-1.5">
                  Display name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 bg-surface-3 border border-surface-4
                             rounded-lg text-sm text-ink-1 outline-none
                             focus:border-brand transition-colors placeholder-ink-5"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-ink-4
                                   uppercase tracking-wider mb-1.5">
                  Username
                  <span className="ml-1 text-ink-5 normal-case font-normal">
                    — used in your public profile URL
                  </span>
                </label>
                <div className="flex items-center bg-surface-3 border border-surface-4
                                rounded-lg overflow-hidden focus-within:border-brand
                                transition-colors">
                  <span className="px-3 py-2 text-sm text-ink-5 border-r
                                   border-surface-4 bg-surface-3 flex-shrink-0">
                    /p/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                    )}
                    placeholder="username"
                    className="flex-1 px-3 py-2 bg-transparent text-sm text-ink-1
                               outline-none placeholder-ink-5"
                  />
                </div>
                {username && (
                  <p className="text-[10px] text-ink-5 mt-1">
                    Your public profile: {window.location.origin}/p/{username}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-medium text-ink-4
                                   uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 bg-surface-3 border border-surface-4
                             rounded-lg text-sm text-ink-3 outline-none opacity-50
                             cursor-not-allowed"
                />
                <p className="text-[10px] text-ink-5 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-brand text-white text-sm font-medium
                           rounded-lg hover:bg-brand/90 disabled:opacity-40
                           transition-colors"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {tab === 'stats' && (
            <div>
              {statsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent
                                  rounded-full animate-spin" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Bookmarks',   value: stats.bookmarkCount,   emoji: '🔖' },
                    { label: 'Wiki topics', value: stats.topicCount,      emoji: '🧠' },
                    { label: 'Collections', value: stats.collectionCount, emoji: '📁' },
                    { label: 'Tags',        value: stats.tagCount,        emoji: '🏷️' },
                    { label: 'Archived',    value: stats.archivedCount,   emoji: '📦' },
                  ].map(stat => (
                    <div key={stat.label}
                         className="bg-surface-3 border border-surface-4 rounded-xl
                                    p-4 flex flex-col gap-1">
                      <span className="text-xl">{stat.emoji}</span>
                      <p className="text-2xl font-bold text-ink-1">
                        {stat.value.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-ink-4">{stat.label}</p>
                    </div>
                  ))}

                  {/* Member since */}
                  <div className="bg-surface-3 border border-surface-4 rounded-xl
                                  p-4 flex flex-col gap-1">
                    <span className="text-xl">🗓</span>
                    <p className="text-sm font-bold text-ink-1">Member</p>
                    <p className="text-[11px] text-ink-4">
                      Building knowledge with Memex
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-3 text-center py-8">
                  Could not load stats
                </p>
              )}
            </div>
          )}

          {/* ── PASSWORD TAB ── */}
          {tab === 'password' && (
            <div className="flex flex-col gap-4">
              {[
                { label: 'Current password', value: currentPw,
                  onChange: setCurrentPw, placeholder: 'Enter current password' },
                { label: 'New password',     value: newPw,
                  onChange: setNewPw,     placeholder: 'At least 8 characters' },
                { label: 'Confirm new password', value: confirmPw,
                  onChange: setConfirmPw, placeholder: 'Repeat new password' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-[10px] font-medium text-ink-4
                                     uppercase tracking-wider mb-1.5">
                    {field.label}
                  </label>
                  <div className="flex items-center bg-surface-3 border border-surface-4
                                  rounded-lg overflow-hidden focus-within:border-brand
                                  transition-colors">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                      className="flex-1 px-3 py-2 bg-transparent text-sm text-ink-1
                                 outline-none placeholder-ink-5"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showpw"
                  checked={showPw}
                  onChange={e => setShowPw(e.target.checked)}
                  className="w-3 h-3"
                />
                <label htmlFor="showpw" className="text-[11px] text-ink-4 cursor-pointer">
                  Show passwords
                </label>
              </div>

              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-[11px] text-red-400">Passwords do not match</p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                className="w-full py-2.5 bg-brand text-white text-sm font-medium
                           rounded-lg hover:bg-brand/90 disabled:opacity-40
                           transition-colors"
              >
                {pwSaving ? 'Changing...' : 'Change password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { adminApi } from '../lib/api'
import { useToast } from '../components/Toast'

export function AdminPage() {
  const { toast } = useToast()

  const [stats,         setStats]         = useState<any | null>(null)
  const [users,         setUsers]         = useState<any[]>([])
  const [totalUsers,    setTotalUsers]    = useState(0)
  const [page,          setPage]          = useState(1)
  const [loading,       setLoading]       = useState(true)
  const [usersLoading,  setUsersLoading]  = useState(true)
  const [search,        setSearch]        = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { fetchStats(); fetchUsers(1) }, [])

  async function fetchStats() {
    const r = await adminApi.getStats()
    if (!r.error) setStats(r.data)
    setLoading(false)
  }

  async function fetchUsers(p: number) {
    setUsersLoading(true)
    const r = await adminApi.getUsers(p)
    if (!r.error) {
      setUsers(r.data.users)
      setTotalUsers(r.data.total)
      setPage(p)
    }
    setUsersLoading(false)
  }

  async function handleDeleteUser(id: string) {
    const r = await adminApi.deleteUser(id)
    if (r.error) {
      toast(r.error.message, 'error')
    } else {
      toast('User deleted', 'success', '🗑')
      setUsers(prev => prev.filter(u => u.id !== id))
      setTotalUsers(prev => prev - 1)
    }
    setConfirmDelete(null)
  }

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function timeAgo(date: string) {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 30)  return `${days}d ago`
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-surface-0 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-ink-1 flex items-center gap-2">
              ⚙️ Admin Dashboard
            </h1>
            <p className="text-xs text-ink-4 mt-0.5">
              Platform overview and user management
            </p>
          </div>
          <a href="/"
             className="text-xs text-brand-bright hover:underline">
            ← Back to app
          </a>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent
                            rounded-full animate-spin" />
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total users',       value: stats.users.total,
                sub: `+${stats.users.newThisWeek} this week`,   emoji: '👥', color: '#4f6ef7' },
              { label: 'New this month',    value: stats.users.newThisMonth,
                sub: 'new signups',                              emoji: '🆕', color: '#10b981' },
              { label: 'Total bookmarks',   value: stats.content.bookmarks,
                sub: `+${stats.content.newBookmarksThisWeek} this week`, emoji: '🔖', color: '#f59e0b' },
              { label: 'Wiki topics',       value: stats.content.topics,
                sub: `${stats.content.collections} collections`, emoji: '🧠', color: '#8b5cf6' },
            ].map(stat => (
              <div key={stat.label}
                   className="bg-surface-2 border border-surface-4 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{stat.emoji}</span>
                  <div className="w-2 h-2 rounded-full"
                       style={{ background: stat.color }} />
                </div>
                <p className="text-2xl font-bold text-ink-1 mb-0.5">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-[10px] text-ink-4">{stat.label}</p>
                <p className="text-[10px] text-ink-5 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users table */}
        <div className="bg-surface-2 border border-surface-4 rounded-2xl overflow-hidden">

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-4
                          border-b border-surface-4">
            <div>
              <h2 className="text-sm font-semibold text-ink-1">Users</h2>
              <p className="text-[11px] text-ink-4 mt-0.5">
                {totalUsers} total users
              </p>
            </div>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-44 bg-surface-3 border border-surface-4
                           rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none
                           focus:border-brand transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent
                              rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-4">
                      {['User', 'Username', 'Bookmarks', 'Joined', 'Actions'].map(h => (
                        <th key={h}
                            className="px-5 py-3 text-left text-[10px] font-medium
                                       text-ink-4 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(user => (
                      <tr key={user.id}
                          className="border-b border-surface-4 hover:bg-surface-3
                                     transition-colors">
                        {/* User */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-brand/20
                                            flex items-center justify-center
                                            text-[11px] font-bold text-brand-bright
                                            flex-shrink-0">
                              {(user.name || user.email)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-ink-1 truncate">
                                {user.name || '—'}
                              </p>
                              <p className="text-[10px] text-ink-4 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-5 py-3">
                          <span className="text-[11px] text-ink-3">
                            {user.username ? `@${user.username}` : '—'}
                          </span>
                        </td>

                        {/* Bookmarks */}
                        <td className="px-5 py-3">
                          <span className="text-xs font-medium text-ink-1">
                            {user.bookmarkCount.toLocaleString()}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="px-5 py-3">
                          <span className="text-[11px] text-ink-4">
                            {timeAgo(user.createdAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3">
                          {confirmDelete === user.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-ink-3">Sure?</span>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-[10px] text-red-400 hover:text-red-300
                                           px-2 py-0.5 bg-red-400/10 border border-red-400/20
                                           rounded transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-[10px] text-ink-4 hover:text-ink-2"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(user.id)}
                              className="text-[10px] text-ink-4 hover:text-red-400
                                         hover:bg-red-400/10 px-2 py-1 rounded
                                         transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalUsers > 20 && (
                <div className="flex items-center justify-between px-5 py-3
                                border-t border-surface-4">
                  <p className="text-[11px] text-ink-4">
                    Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalUsers)} of {totalUsers}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fetchUsers(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 text-xs text-ink-3 bg-surface-3
                                 border border-surface-4 rounded-lg
                                 disabled:opacity-40 hover:bg-surface-4
                                 transition-colors"
                    >
                      ← Prev
                    </button>
                    <span className="px-3 py-1 text-xs text-ink-2">
                      {page} / {Math.ceil(totalUsers / 20)}
                    </span>
                    <button
                      onClick={() => fetchUsers(page + 1)}
                      disabled={page >= Math.ceil(totalUsers / 20)}
                      className="px-3 py-1 text-xs text-ink-3 bg-surface-3
                                 border border-surface-4 rounded-lg
                                 disabled:opacity-40 hover:bg-surface-4
                                 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { bookmarksApi, tagsApi } from '../lib/api'
import { BookmarkCard } from '../components/BookmarkCard'
import { Spinner } from '../components/Spinner'

export function DashboardPage() {
  const { auth, logout } = useAuth()

  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [tags,      setTags]      = useState<any[]>([])
  const [search,    setSearch]    = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [loading,   setLoading]   = useState(true)

  // Debounced search — wait 300ms after user stops typing
  // before hitting the API. Avoids hammering the server
  // on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch bookmarks whenever search or tag filter changes
  useEffect(() => {
    fetchBookmarks()
  }, [debouncedSearch, activeTag])

  // Fetch tags once on mount
  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchBookmarks() {
    setLoading(true)
    const result = await bookmarksApi.list({
      search: debouncedSearch,
      tag:    activeTag,
    })
    if (!result.error) setBookmarks(result.data.items)
    setLoading(false)
  }

  async function fetchTags() {
    const result = await tagsApi.list()
    if (!result.error) setTags(result.data.items)
  }

  async function handleDelete(id: string) {
    // Optimistic update — remove from UI immediately
    // If the API call fails, we refetch to restore
    setBookmarks(prev => prev.filter(b => b.id !== id))

    const result = await bookmarksApi.delete(id)
    if (result.error) {
      // API failed — restore by refetching
      fetchBookmarks()
    } else {
      // Success — refresh tags in case counts changed
      fetchTags()
    }
  }

  function handleTagClick(tagName: string) {
    // Toggle tag filter
    setActiveTag(prev => prev === tagName ? '' : tagName)
    setSearch('')
  }

  const user = auth.status === 'authenticated' ? auth.user : null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-semibold text-gray-800">Memex</span>
          </div>

          {/* Search bar — center, takes available space */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search your bookmarks..."
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveTag('') }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200
                           rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500
                           focus:border-transparent focus:bg-white transition-colors
                           placeholder-gray-400"
              />
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <span className="text-xs text-gray-500 hidden sm:block">
              {user?.name ?? user?.email}
            </span>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors
                         px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">

        {/* Sidebar — tags */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sticky top-20">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Tags
            </h3>

            {/* All bookmarks */}
            <button
              onClick={() => { setActiveTag(''); setSearch('') }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm
                          transition-colors mb-1
                          ${!activeTag
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'}`}
            >
              All bookmarks
            </button>

            {/* Tag list */}
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.name)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm
                            transition-colors flex items-center justify-between
                            ${activeTag === tag.name
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="truncate">{tag.name}</span>
                <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                  {tag.count}
                </span>
              </button>
            ))}

            {tags.length === 0 && (
              <p className="text-xs text-gray-400 px-2">
                Tags will appear here after you save bookmarks
              </p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          {/* Active filters indicator */}
          {(activeTag || debouncedSearch) && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Showing results for:</span>
              {activeTag && (
                <span className="flex items-center gap-1 px-2 py-1 bg-primary-50
                                 text-primary-700 text-xs rounded-full">
                  #{activeTag}
                  <button onClick={() => setActiveTag('')} className="hover:text-primary-900">×</button>
                </span>
              )}
              {debouncedSearch && (
                <span className="flex items-center gap-1 px-2 py-1 bg-gray-100
                                 text-gray-600 text-xs rounded-full">
                  "{debouncedSearch}"
                  <button onClick={() => setSearch('')} className="hover:text-gray-800">×</button>
                </span>
              )}
            </div>
          )}

          {/* Bookmark count */}
          {!loading && (
            <p className="text-xs text-gray-400 mb-4">
              {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
            </p>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          )}

          {/* Empty state */}
          {!loading && bookmarks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center
                              justify-center mb-4">
                <span className="text-3xl">🔖</span>
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                {debouncedSearch || activeTag ? 'No results found' : 'No bookmarks yet'}
              </h3>
              <p className="text-xs text-gray-400 max-w-xs">
                {debouncedSearch || activeTag
                  ? 'Try a different search or tag'
                  : 'Install the Memex extension and click it on any webpage to save your first bookmark'}
              </p>
            </div>
          )}

          {/* Bookmark grid */}
          {!loading && bookmarks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map(bookmark => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={handleDelete}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

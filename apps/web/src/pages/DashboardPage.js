import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { bookmarksApi, tagsApi, collectionsApi } from '../lib/api';
import { BookmarkCard } from '../components/BookmarkCard';
import { BookmarkModalLoader } from '../components/BookmarkModalLoader';
import { BookmarkDetailPage } from './BookmarkDetailPage';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeToggle';
import { CollectionsPage } from './CollectionsPage';
import { SearchModal } from '../components/SearchModal';
import { CollectionDetailPage } from './CollectionDetailPage';
import { WikiPage } from './WikiPage';
import { ArchivePage } from './ArchivePage';
import { BulkActionBar } from '../components/BulkActionBar';
import { ProfileModal } from '../components/ProfileModal';
import { ReadingListPage } from './ReadingListPage';
import { DailyRediscovery } from '../components/DailyRediscovery';
import { TopicPage } from './TopicPage';
export function DashboardPage({ theme, toggleTheme }) {
    const { auth, logout } = useAuth();
    const [page, setPage] = useState({ type: 'home' });
    const [bookmarks, setBookmarks] = useState([]);
    const [tags, setTags] = useState([]);
    const [collections, setCollections] = useState([]);
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState('');
    const [activeCollection, setActiveCollection] = useState('');
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('grid');
    const [topics, setTopics] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showProfile, setShowProfile] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);
    useEffect(() => {
        if (page.type === 'home')
            fetchBookmarks();
        // Clear selection when navigating away
        setSelectedIds([]);
    }, [debouncedSearch, activeTag, activeCollection, page]);
    useEffect(() => {
        fetchTags();
        fetchCollections();
        fetchTopics();
        // Load avatar from auth user
        if (auth.status === 'authenticated' && auth.user?.avatarUrl) {
            setAvatarUrl(auth.user.avatarUrl);
        }
    }, []);
    // Global Cmd+K to open search
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);
    async function fetchBookmarks() {
        setLoading(true);
        const result = await bookmarksApi.list({
            search: debouncedSearch,
            tag: activeTag,
            collectionId: activeCollection,
        });
        if (!result.error)
            setBookmarks(result.data.items);
        setLoading(false);
    }
    async function fetchTags() {
        const r = await tagsApi.list();
        if (!r.error)
            setTags(r.data.items);
    }
    async function fetchTopics() {
        const { topicsApi } = await import('../lib/api');
        const r = await topicsApi.list();
        if (!r.error)
            setTopics(r.data.items);
    }
    async function fetchCollections() {
        const r = await collectionsApi.list();
        if (!r.error)
            setCollections(r.data.items);
    }
    async function handleDelete(id) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
        const r = await bookmarksApi.delete(id);
        if (r.error)
            fetchBookmarks();
        else {
            fetchTags();
            fetchCollections();
        }
    }
    async function handleArchive(id) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
        await bookmarksApi.archive(id);
        fetchTags();
    }
    // ── Bulk action handlers ──
    function toggleSelect(id) {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
    async function handleBulkDelete(ids) {
        setBookmarks(prev => prev.filter(b => !ids.includes(b.id)));
        await Promise.all(ids.map(id => bookmarksApi.delete(id)));
        setSelectedIds([]);
        fetchTags();
        fetchCollections();
    }
    async function handleBulkArchive(ids) {
        setBookmarks(prev => prev.filter(b => !ids.includes(b.id)));
        await Promise.all(ids.map(id => bookmarksApi.archive(id)));
        setSelectedIds([]);
    }
    async function handleBulkAddToCollection(ids, collectionId) {
        await Promise.all(ids.map(id => collectionsApi.addBookmark(collectionId, id)));
        setSelectedIds([]);
        fetchCollections();
    }
    async function handleBulkTag(ids, tag) {
        await Promise.all(ids.map(id => bookmarksApi.update(id, { tags: [tag] })));
        setSelectedIds([]);
        fetchTags();
    }
    function handleTagClick(tag) {
        setActiveTag(prev => prev === tag ? '' : tag);
        setActiveCollection('');
        setSearch('');
        setPage({ type: 'home' });
    }
    function handleCollectionClick(id) {
        setPage({ type: 'collection-detail', collectionId: id });
    }
    const user = auth.status === 'authenticated' ? auth.user : null;
    // Sidebar current page indicator
    const sidebarPage = page.type === 'collections' || page.type === 'collection-detail'
        ? 'collections'
        : page.type === 'wiki' || page.type === 'topic'
            ? 'wiki'
            : page.type === 'archive'
                ? 'archive'
                : page.type === 'reading'
                    ? 'reading'
                    : 'home';
    return (_jsxs("div", { className: "flex h-screen overflow-hidden bg-surface-0", children: [_jsx(Sidebar, { tags: tags, collections: collections, activeTag: activeTag, activeCollection: activeCollection, bookmarkCount: bookmarks.length, currentPage: sidebarPage, onTagClick: handleTagClick, onCollectionClick: handleCollectionClick, onCollectionsChange: fetchCollections, onOpenCollectionsPage: () => setPage({ type: 'collections' }), onOpenWikiPage: () => setPage({ type: 'wiki' }), onOpenArchive: () => setPage({ type: 'archive' }), onOpenReadingList: () => setPage({ type: 'reading' }), onOpenProfile: () => setShowProfile(true), avatarUrl: avatarUrl, onGoHome: () => {
                    setPage({ type: 'home' });
                    setActiveCollection('');
                    setActiveTag('');
                    setSearch('');
                }, userEmail: user?.email ?? '', onLogout: logout }), page.type === 'collections' && (_jsx(CollectionsPage, { collections: collections, onOpenCollection: id => setPage({ type: 'collection-detail', collectionId: id }), onCollectionsChange: fetchCollections })), page.type === 'wiki' && (_jsx(WikiPage, { topics: topics, theme: theme, onOpenTopic: id => setPage({ type: 'topic', topicId: id }), onTopicsChange: fetchTopics })), page.type === 'topic' && (_jsx(TopicPage, { topicId: page.topicId, allTopics: topics, onBack: () => setPage({ type: 'wiki' }), onDelete: async (id) => {
                    const { topicsApi } = await import('../lib/api');
                    await topicsApi.delete(id);
                    fetchTopics();
                    setPage({ type: 'wiki' });
                } })), page.type === 'collection-detail' && (_jsx(CollectionDetailPage, { collectionId: page.collectionId, allCollections: collections, onBack: () => setPage({ type: 'collections' }), onTagClick: handleTagClick, onCollectionsChange: fetchCollections })), page.type === 'archive' && (_jsx(ArchivePage, { onOpenBookmark: id => setPage({ type: 'bookmark-detail', bookmarkId: id }) })), page.type === 'reading' && (_jsx(ReadingListPage, { onOpenBookmark: id => setPage({ type: 'bookmark-detail', bookmarkId: id }) })), page.type === 'home' && (_jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-surface-1", children: [_jsxs("header", { className: "h-12 border-b border-surface-4 flex items-center\n                             gap-3 px-5 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-ink-3 flex-shrink-0", children: [_jsx("span", { children: "Memex" }), activeTag && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-ink-5", children: "/" }), _jsxs("span", { className: "text-brand-bright", children: ["#", activeTag] })] }))] }), _jsx("div", { className: "flex-1 max-w-md", children: _jsxs("div", { className: "relative", children: [_jsxs("svg", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), _jsx("input", { type: "text", placeholder: "Search bookmarks...", value: search, onChange: e => { setSearch(e.target.value); setActiveTag(''); setActiveCollection(''); }, className: "w-full pl-8 pr-3 py-1.5 bg-surface-3 border border-surface-4\n                             rounded-lg text-xs text-ink-1 placeholder-ink-4 outline-none\n                             focus:border-brand transition-colors" })] }) }), _jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [_jsx("div", { className: "flex items-center gap-0.5 bg-surface-3 rounded-md p-0.5", children: ['grid', 'list'].map(v => (_jsx("button", { onClick: () => setView(v), className: `w-6 h-6 rounded flex items-center justify-center
                                      transition-colors
                                      ${view === v ? 'bg-surface-4 text-ink-1' : 'text-ink-4 hover:text-ink-2'}`, children: v === 'grid' ? (_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "14", width: "7", height: "7" })] })) : (_jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), _jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), _jsx("line", { x1: "3", y1: "18", x2: "21", y2: "18" })] })) }, v))) }), _jsx(ThemeToggle, { theme: theme, toggle: toggleTheme })] })] }), _jsxs("main", { className: "flex-1 overflow-y-auto p-5", children: [activeTag && (_jsx("div", { className: "flex items-center gap-2 mb-4", children: _jsxs("span", { className: "flex items-center gap-1 px-2 py-1 bg-brand/10\n                                 text-brand-bright text-xs rounded-full border border-brand/20", children: ["#", activeTag, _jsx("button", { onClick: () => setActiveTag(''), className: "hover:text-white ml-0.5", children: "\u00D7" })] }) })), !activeTag && !debouncedSearch && (_jsx(DailyRediscovery, { onOpenBookmark: id => setPage({ type: 'bookmark-detail', bookmarkId: id }) })), !loading && (_jsxs("p", { className: "text-[11px] text-ink-4 mb-4", children: [bookmarks.length, " ", bookmarks.length === 1 ? 'bookmark' : 'bookmarks'] })), loading && (_jsx("div", { className: "flex items-center justify-center py-24", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                                rounded-full animate-spin" }) })), !loading && bookmarks.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center", children: [_jsx("div", { className: "w-14 h-14 bg-surface-3 rounded-2xl flex items-center\n                                justify-center mb-4 border border-surface-4", children: _jsx("svg", { className: "w-6 h-6 text-ink-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5, children: _jsx("path", { d: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" }) }) }), _jsx("p", { className: "text-sm font-medium text-ink-2 mb-1", children: debouncedSearch || activeTag ? 'Nothing found' : 'No bookmarks yet' }), _jsx("p", { className: "text-xs text-ink-4 max-w-xs", children: debouncedSearch || activeTag
                                            ? 'Try a different search or filter'
                                            : 'Use the Memex extension to save your first bookmark' })] })), !loading && bookmarks.length > 0 && view === 'grid' && (_jsx("div", { className: "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3\n                              space-y-3", children: bookmarks.map(b => (_jsx("div", { className: "break-inside-avoid mb-3", children: _jsx(BookmarkCard, { bookmark: b, collections: collections, isSelected: selectedIds.includes(b.id), onToggleSelect: toggleSelect, onDelete: handleDelete, onArchive: handleArchive, onAddToReading: () => { }, onTagClick: handleTagClick, onOpenModal: b => setPage({ type: 'bookmark-detail', bookmarkId: b.id }), onCollectionsChange: () => { fetchCollections(); fetchBookmarks(); } }, b.id) }, b.id))) })), !loading && bookmarks.length > 0 && view === 'list' && (_jsx("div", { className: "flex flex-col gap-1", children: bookmarks.map(b => (_jsx(ListRow, { bookmark: b, onDelete: handleDelete, onTagClick: handleTagClick, onOpenModal: b => setPage({ type: 'bookmark-detail', bookmarkId: b.id }) }, b.id))) }))] })] })), showProfile && auth.status === 'authenticated' && (_jsx(ProfileModal, { user: { ...auth.user, avatarUrl }, onClose: () => setShowProfile(false), onUpdate: (updatedUser) => {
                    if (updatedUser.avatarUrl)
                        setAvatarUrl(updatedUser.avatarUrl);
                    setShowProfile(false);
                } })), _jsx(BulkActionBar, { selectedIds: selectedIds, collections: collections, onClear: () => setSelectedIds([]), onDelete: handleBulkDelete, onArchive: handleBulkArchive, onAddToCollection: handleBulkAddToCollection, onAddTag: handleBulkTag }), showSearch && (_jsx(SearchModal, { onClose: () => setShowSearch(false), onOpenBookmark: id => { setSelectedId(id); setShowSearch(false); }, onOpenTopic: id => { setPage({ type: 'topic', topicId: id }); setShowSearch(false); } })), page.type === 'bookmark-detail' && (_jsx(BookmarkDetailPage, { bookmarkId: page.bookmarkId, onBack: () => setPage({ type: 'home' }), onDelete: id => { handleDelete(id); setPage({ type: 'home' }); }, onTagClick: handleTagClick })), selectedId && (_jsx(BookmarkModalLoader, { bookmarkId: selectedId, onClose: () => setSelectedId(null), onDelete: id => { handleDelete(id); setSelectedId(null); }, onTagClick: tag => { handleTagClick(tag); setSelectedId(null); } }))] }));
}
function ListRow({ bookmark, onDelete, onTagClick, onOpenModal }) {
    let domain = '';
    try {
        domain = new URL(bookmark.url).hostname.replace('www.', '');
    }
    catch { }
    function timeAgo(date) {
        const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (s < 3600)
            return `${Math.floor(s / 60)}m`;
        if (s < 86400)
            return `${Math.floor(s / 3600)}h`;
        return `${Math.floor(s / 86400)}d`;
    }
    const atts = bookmark.attachments ?? [];
    return (_jsxs("div", { onClick: () => onOpenModal(bookmark), className: "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer\n                 hover:bg-surface-2 transition-colors border border-transparent\n                 hover:border-surface-4", children: [bookmark.faviconUrl && (_jsx("img", { src: bookmark.faviconUrl, alt: "", className: "w-4 h-4 flex-shrink-0", onError: e => (e.currentTarget.style.display = 'none') })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs text-ink-1 truncate", children: bookmark.title ?? domain }), _jsx("p", { className: "text-[10px] text-ink-4 truncate", children: domain })] }), atts.length > 0 && (_jsxs("div", { className: "flex items-center gap-1 text-[10px]", children: [atts.some((a) => a.type === 'screenshot' || a.type === 'area_screenshot') && '📸', atts.some((a) => a.type === 'text') && '📝'] })), _jsx("div", { className: "flex items-center gap-1", children: bookmark.tags.slice(0, 2).map((tag) => (_jsx("button", { onClick: e => { e.stopPropagation(); onTagClick(tag.name); }, className: "px-1.5 py-0.5 bg-brand/10 text-brand-bright\n                             text-[9px] rounded hover:bg-brand/20 transition-colors", children: tag.name }, tag.id))) }), _jsx("span", { className: "text-[10px] text-ink-4 w-6", children: timeAgo(bookmark.createdAt) }), _jsx("button", { onClick: e => { e.stopPropagation(); onDelete(bookmark.id); }, className: "opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center\n                   justify-center rounded text-ink-4 hover:text-red-400\n                   hover:bg-red-400/10 transition-all", children: _jsxs("svg", { className: "w-3 h-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6l-1 14H6L5 6" })] }) })] }));
}

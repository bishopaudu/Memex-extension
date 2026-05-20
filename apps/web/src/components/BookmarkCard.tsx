interface Tag {
  id: string
  name: string
  color: string | null
}

interface Bookmark {
  id: string
  url: string
  title: string | null
  description: string | null
  screenshotUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  tags: Tag[]
  createdAt: string
}

interface Props {
  bookmark: Bookmark
  onDelete: (id: string) => void
  onTagClick: (tag: string) => void
}

export function BookmarkCard({
  bookmark,
  onDelete,
  onTagClick,
}: Props) {
  // Show screenshot first, then OG image
  const image = bookmark.screenshotUrl ?? bookmark.ogImageUrl

  // Extract clean domain
  let domain = ''

  try {
    domain = new URL(bookmark.url).hostname.replace('www.', '')
  } catch {
    domain = bookmark.url
  }

  // Relative time formatter
  function timeAgo(date: string) {
    const seconds = Math.floor(
      (Date.now() - new Date(date).getTime()) / 1000
    )

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`

    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div
      className="
        group
        bg-white
        rounded-xl
        border
        border-gray-100
        overflow-hidden
        hover:shadow-md
        hover:border-gray-200
        transition-all
        duration-200
      "
    >
      {/* Thumbnail */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="w-full h-36 bg-gray-50 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={bookmark.title ?? ''}
              className="
                w-full
                h-full
                object-cover
                group-hover:scale-105
                transition-transform
                duration-300
              "
              onError={e => {
                e.currentTarget.style.display = 'none'

                const parent = e.currentTarget.parentElement

                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center">
                      <span class="text-3xl text-gray-300">🔖</span>
                    </div>
                  `
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-3xl text-gray-300">🔖</span>
            </div>
          )}
        </div>
      </a>

      {/* Content */}
      <div className="p-3">
        {/* Title + domain */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/link"
        >
          <p
            className="
              text-sm
              font-medium
              text-gray-800
              line-clamp-2
              group-hover/link:text-primary-600
              transition-colors
              leading-snug
            "
          >
            {bookmark.title ?? domain}
          </p>

          <div className="flex items-center gap-1 mt-1">
            {bookmark.faviconUrl && (
              <img
                src={bookmark.faviconUrl}
                alt=""
                className="w-3 h-3"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}

            <p className="text-xs text-gray-400 truncate">
              {domain}
            </p>
          </div>
        </a>

        {/* Description */}
        {bookmark.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
            {bookmark.description}
          </p>
        )}

        {/* Tags */}
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {bookmark.tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => onTagClick(tag.name)}
                className="
                  px-2
                  py-0.5
                  bg-primary-50
                  text-primary-600
                  text-xs
                  rounded-full
                  hover:bg-primary-100
                  transition-colors
                "
                style={{
                  backgroundColor: tag.color
                    ? `${tag.color}20`
                    : undefined,
                  color: tag.color ?? undefined,
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">
            {timeAgo(bookmark.createdAt)}
          </span>

          <button
            onClick={() => onDelete(bookmark.id)}
            className="
              opacity-0
              group-hover:opacity-100
              transition-opacity
              text-gray-300
              hover:text-red-400
              p-1
              rounded
            "
            title="Delete bookmark"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
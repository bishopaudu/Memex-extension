import { useState } from 'react'

export function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started')

  const sections = [
    { id: 'getting-started', label: '🚀 Getting started',  emoji: '🚀' },
    { id: 'bookmarks',       label: '🔖 Bookmarks',         emoji: '🔖' },
    { id: 'collections',     label: '📁 Collections',       emoji: '📁' },
    { id: 'wiki',            label: '🧠 Wiki & Knowledge Graph', emoji: '🧠' },
    { id: 'sharing',         label: '🌍 Sharing & Explore',  emoji: '🌍' },
    { id: 'reading',         label: '📖 Reading list & Archive', emoji: '📖' },
    { id: 'extension',       label: '🧩 Browser extension', emoji: '🧩' },
  ]

  return (
    <div className="min-h-screen bg-surface-0">

      {/* Nav */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center
                          justify-center text-white font-bold text-xs">M</div>
          <span className="font-semibold text-ink-1 text-sm">Memex</span>
          <span className="text-ink-5 text-xs">/</span>
          <span className="text-xs text-ink-3">Help</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/about"    className="text-xs text-ink-3 hover:text-ink-1 transition-colors">About</a>
          <a href="/explore"  className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Explore</a>
          <a href="/feedback" className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Feedback</a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-10">

        {/* Sidebar nav */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <p className="text-[10px] font-semibold text-ink-4 uppercase
                        tracking-wider mb-3 px-2">
            Help topics
          </p>
          <nav className="flex flex-col gap-0.5 sticky top-10">
            {sections.map(s => (
              
                <a key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-2 text-xs rounded-lg transition-colors
                            ${activeSection === s.id
                              ? 'bg-brand/10 text-brand-bright'
                              : 'text-ink-3 hover:text-ink-1 hover:bg-surface-2'}`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-2xl flex flex-col gap-16 pb-20">

          <div>
            <h1 className="text-2xl font-bold text-ink-1 mb-2">Help center</h1>
            <p className="text-sm text-ink-3">
              Everything you need to know about using Memex — your visual
              memory for the internet.
            </p>
          </div>

          {/* Getting started */}
          <section id="getting-started">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              🚀 Getting started
            </h2>
            <div className="flex flex-col gap-4 text-sm text-ink-2 leading-relaxed">
              <p>
                Memex is a visual bookmarking and knowledge wiki tool. Save anything
                from the web — links, screenshots, highlights — and organize them
                into collections and a connected wiki.
              </p>
              <Step n={1} title="Install the browser extension">
                Save pages, screenshots, and highlights directly from any website
                with one click.
              </Step>
              <Step n={2} title="Save your first bookmark">
                Click the Memex icon in your toolbar, add tags, and optionally
                assign it to a collection.
              </Step>
              <Step n={3} title="Organize with collections">
                Group related bookmarks into collections — like folders, but
                visual and shareable.
              </Step>
              <Step n={4} title="Build your wiki">
                Turn your saved bookmarks into a connected knowledge base using
                the Wiki feature.
              </Step>
            </div>
          </section>

          {/* Bookmarks */}
          <section id="bookmarks">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              🔖 Bookmarks
            </h2>
            <div className="flex flex-col gap-4 text-sm text-ink-2 leading-relaxed">
              <FeatureRow emoji="📸" title="Screenshots & highlights">
                Capture a full-page screenshot, select an area, or right-click
                selected text to save a highlight — all from the extension.
              </FeatureRow>
              <FeatureRow emoji="📝" title="Extracted text">
                Memex extracts readable article text automatically — including
                special handling for Wikipedia pages. Edit the extracted text
                directly from the Notes tab.
              </FeatureRow>
              <FeatureRow emoji="✏️" title="Editing">
                Open any bookmark and click Edit to change the title, description,
                or tags at any time.
              </FeatureRow>
              <FeatureRow emoji="⬇️" title="Export">
                Export any bookmark as a Markdown file, or copy the title and URL
                for use elsewhere.
              </FeatureRow>
              <FeatureRow emoji="✅" title="Bulk actions">
                Hover a bookmark card to select it with the checkbox. Select
                multiple to tag, move to a collection, archive, or delete them
                all at once.
              </FeatureRow>
            </div>
          </section>

          {/* Collections */}
          <section id="collections">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              📁 Collections
            </h2>
            <div className="flex flex-col gap-4 text-sm text-ink-2 leading-relaxed">
              <p>
                Collections are visual folders for related bookmarks. Give them
                an icon, color, and description — then add bookmarks from the
                save screen, the bookmark detail page, or in bulk.
              </p>
              <FeatureRow emoji="🌍" title="Sharing">
                Toggle any collection to Public to get a shareable link. Anyone
                with the link can browse the collection — no account needed.
              </FeatureRow>
            </div>
          </section>

          {/* Wiki & Knowledge Graph — the big one */}
          <section id="wiki">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              🧠 Wiki & Knowledge Graph
            </h2>
            <div className="flex flex-col gap-5 text-sm text-ink-2 leading-relaxed">
              <p>
                The Wiki turns your saved bookmarks into a connected knowledge
                base. Each <strong className="text-ink-1">topic</strong> is a page
                with rich content blocks, references to your bookmarks, and
                connections to other topics.
              </p>

              <FeatureRow emoji="📝" title="Block editor">
                Topics use a Notion-style block editor: headings, paragraphs,
                bullet lists, quotes, code blocks, dividers, and bookmark
                embeds. Changes auto-save as you type.
              </FeatureRow>

              <FeatureRow emoji="🔗" title="References">
                Add any of your bookmarks as a reference on a topic, with an
                optional note explaining why it's relevant.
              </FeatureRow>

              <FeatureRow emoji="🕸️" title="Connections">
                Link topics together to show how ideas relate — "leads to",
                "part of", or any custom label.
              </FeatureRow>

              {/* Knowledge Graph deep dive */}
              <div className="bg-surface-2 border border-surface-4 rounded-2xl p-5 mt-2">
                <h3 className="text-sm font-bold text-ink-1 mb-3 flex items-center gap-2">
                  🕸️ Understanding the Knowledge Graph
                </h3>
                <p className="text-xs text-ink-3 mb-4 leading-relaxed">
                  The graph view visualizes every topic as a node and every
                  connection as an edge — giving you a bird's-eye view of how
                  your knowledge fits together.
                </p>

                <div className="flex flex-col gap-3">
                  <GraphMode emoji="🧭" name="Navigate mode">
                    The default mode. Click a node to open that topic.
                    Double-click a node to focus on it and its immediate
                    connections.
                  </GraphMode>

                  <GraphMode emoji="🔌" name="Connect mode">
                    Click two nodes in sequence to create a connection between
                    them. Useful for quickly linking related topics while
                    browsing the graph.
                  </GraphMode>

                  <GraphMode emoji="🛣️" name="Path mode">
                    Click two nodes to find the shortest path between them.
                    The path is highlighted with animated flowing dots —
                    great for understanding how two ideas are related.
                  </GraphMode>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-4 flex flex-col gap-2">
                  <p className="text-xs text-ink-3">
                    <strong className="text-ink-1">Hover any node</strong> to see
                    a preview card with its title, emoji, and summary.
                  </p>
                  <p className="text-xs text-ink-3">
                    <strong className="text-ink-1">Amber dashed rings</strong>
                    {' '}mark orphan topics — pages with no connections to
                    anything else.
                  </p>
                  <p className="text-xs text-ink-3">
                    <strong className="text-ink-1">Search</strong> highlights
                    matching nodes directly on the graph.
                  </p>
                  <p className="text-xs text-ink-3">
                    <strong className="text-ink-1">Heatmap toggle</strong> colors
                    nodes by how many references and connections they have —
                    bigger and brighter means more central to your knowledge base.
                  </p>
                  <p className="text-xs text-ink-3">
                    <strong className="text-ink-1">Minimap</strong> in the corner
                    helps you navigate large graphs. Use the zoom controls or
                    press <kbd className="px-1 py-0.5 bg-surface-3 rounded text-[10px]">Esc</kbd>{' '}
                    to exit focus mode or clear a path.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Sharing & Explore */}
          <section id="sharing">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              🌍 Sharing & Explore
            </h2>
            <div className="flex flex-col gap-4 text-sm text-ink-2 leading-relaxed">
              <p>
                You can make individual bookmarks, collections, and wiki topics
                public. Each gets its own shareable link that works without an
                account — perfect for sharing research, reading lists, or
                curated resources.
              </p>
              <FeatureRow emoji="🔖" title="Public bookmarks">
                Open any bookmark and toggle the Public switch. You'll get a
                link like <code className="text-[11px] bg-surface-3 px-1.5 py-0.5 rounded">/p/b/your-slug</code>{' '}
                showing the page preview, screenshots, notes, and tags.
              </FeatureRow>
              <FeatureRow emoji="🧠" title="Public topics & collections">
                Toggle Sharing in the right panel of any topic, or on a
                collection's page, to generate a public link.
              </FeatureRow>
              <FeatureRow emoji="🌍" title="The Explore page">
                Everything made public appears on{' '}
                <a href="/explore" className="text-brand-bright hover:underline">
                  /explore
                </a>{' '}
                — a discovery feed where anyone can browse public knowledge
                from the Memex community.
              </FeatureRow>
              <FeatureRow emoji="👤" title="Your profile">
                Your public profile at{' '}
                <code className="text-[11px] bg-surface-3 px-1.5 py-0.5 rounded">/p/your-username</code>{' '}
                lists everything you've made public.
              </FeatureRow>
            </div>
          </section>

          {/* Reading list & Archive */}
          <section id="reading">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              📖 Reading list & Archive
            </h2>
            <div className="flex flex-col gap-4 text-sm text-ink-2 leading-relaxed">
              <FeatureRow emoji="📖" title="Reading list">
                Save bookmarks to read later. Mark items as read to track
                progress, filter by unread/read/all.
              </FeatureRow>
              <FeatureRow emoji="📦" title="Archive">
                Archive bookmarks you no longer need in your main view but
                don't want to delete. Restore them anytime.
              </FeatureRow>
              <FeatureRow emoji="✨" title="Daily rediscovery">
                A rotating carousel on your home screen surfaces older saves —
                a gentle nudge to revisit things you've forgotten about.
              </FeatureRow>
            </div>
          </section>

          {/* Extension */}
          <section id="extension">
            <h2 className="text-lg font-bold text-ink-1 mb-4 flex items-center gap-2">
              🧩 Browser extension
            </h2>
            <div className="flex flex-col gap-4 text-sm text-ink-2 leading-relaxed">
              <FeatureRow emoji="📸" title="Save the current page">
                Click the Memex icon — it auto-captures a screenshot and
                pre-fills the title and description.
              </FeatureRow>
              <FeatureRow emoji="✂️" title="Area screenshots">
                Select any portion of a page to save just that section.
              </FeatureRow>
              <FeatureRow emoji="🖱️" title="Save highlights">
                Select text on any page, right-click, and choose
                "Save highlight to Memex".
              </FeatureRow>
              <FeatureRow emoji="📄" title="Extract page content">
                Pull structured text, images, or links from the current page
                directly into your bookmark's attachments.
              </FeatureRow>
            </div>
          </section>

          {/* Still need help */}
          <div className="bg-surface-2 border border-surface-4 rounded-2xl p-6
                          text-center">
            <p className="text-sm font-medium text-ink-1 mb-1">
              Still need help?
            </p>
            <p className="text-xs text-ink-4 mb-4">
              Send us feedback or report an issue
            </p>
            <a href="/feedback"
               className="inline-block px-4 py-2 bg-brand text-white text-xs
                          font-medium rounded-xl hover:bg-brand/90 transition-colors">
              Go to Feedback →
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-brand/10 text-brand-bright text-xs
                      font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-1 mb-0.5">{title}</p>
        <p className="text-xs text-ink-4 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function FeatureRow({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-sm font-semibold text-ink-1 mb-0.5">{title}</p>
        <p className="text-xs text-ink-4 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function GraphMode({ emoji, name, children }: { emoji: string; name: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-surface-3 border border-surface-4 rounded-xl p-3">
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-xs font-semibold text-ink-1 mb-0.5">{name}</p>
        <p className="text-[11px] text-ink-4 leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

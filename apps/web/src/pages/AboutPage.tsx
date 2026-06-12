export function AboutPage() {
  return (
    <div className="min-h-screen bg-surface-0">

      {/* Nav */}
      <nav className="border-b border-surface-4 px-6 py-3 flex items-center
                      justify-between max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center
                          justify-center text-white font-bold text-xs">M</div>
          <span className="font-semibold text-ink-1 text-sm">Memex</span>
          <span className="text-ink-5 text-xs">/</span>
          <span className="text-xs text-ink-3">About</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/help"     className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Help</a>
          <a href="/explore"  className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Explore</a>
          <a href="/feedback" className="text-xs text-ink-3 hover:text-ink-1 transition-colors">Feedback</a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">

        <div className="text-center mb-12">
          <div className="w-12 h-12 bg-brand rounded-2xl flex items-center
                          justify-center text-white font-bold text-xl mx-auto mb-4">
            M
          </div>
          <h1 className="text-3xl font-bold text-ink-1 mb-3">
            A visual memory for the internet
          </h1>
          <p className="text-sm text-ink-3 leading-relaxed">
            Memex helps you save, organize, and rediscover everything that
            matters from the web — and turn it into a connected knowledge base.
          </p>
        </div>

        <div className="flex flex-col gap-8 text-sm text-ink-2 leading-relaxed">

          <section>
            <h2 className="text-base font-bold text-ink-1 mb-2">The problem</h2>
            <p>
              Bookmarks pile up. Tabs multiply. Good ideas get buried in a list
              that's impossible to search and easy to forget. Most bookmarking
              tools are just glorified link lists — they don't help you actually
              <em> use </em> what you save.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-ink-1 mb-2">Our approach</h2>
            <p className="mb-3">
              Memex combines three ideas that usually live in separate apps:
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 items-start">
                <span className="text-lg">🔖</span>
                <p>
                  <strong className="text-ink-1">Visual bookmarking</strong> — save
                  links, screenshots, and highlights with rich previews, like a
                  personal Pinterest.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg">🧠</span>
                <p>
                  <strong className="text-ink-1">A connected wiki</strong> — turn
                  saved content into topics, link related ideas, and visualize
                  it all as a knowledge graph.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-lg">🌍</span>
                <p>
                  <strong className="text-ink-1">Shareable knowledge</strong> —
                  make any bookmark, collection, or topic public and let others
                  discover it.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-ink-1 mb-2">Who it's for</h2>
            <p>
              Developers researching a topic, designers collecting inspiration,
              students organizing study materials, writers gathering sources —
              anyone who saves things to "look at later" and actually wants to
              come back to them.
            </p>
          </section>

          <section className="bg-surface-2 border border-surface-4 rounded-2xl p-6 text-center">
            <p className="text-sm font-medium text-ink-1 mb-1">
              Built by an indie developer
            </p>
            <p className="text-xs text-ink-4 mb-4">
              Memex is actively developed — feedback shapes what gets built next.
            </p>
            <a href="/feedback"
               className="inline-block px-4 py-2 bg-brand text-white text-xs
                          font-medium rounded-xl hover:bg-brand/90 transition-colors">
              Share your thoughts →
            </a>
          </section>
        </div>
      </main>
    </div>
  )
}

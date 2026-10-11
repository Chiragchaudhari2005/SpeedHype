import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const timeAgo = (value) => {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

const itemMeta = {
  blog: { label: 'Journal Story', icon: '✎', accent: 'text-red-400', badgeBg: 'bg-red-950/70 border-red-800/60 text-red-300' },
  community: { label: 'Paddock Crew', icon: '◎', accent: 'text-orange-400', badgeBg: 'bg-orange-950/70 border-orange-800/60 text-orange-300' },
  vehicle: { label: 'New Car Launch', icon: '↗', accent: 'text-emerald-400', badgeBg: 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300' },
}

function FeedItem({ item }) {
  const meta = itemMeta[item.type] || itemMeta.vehicle
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-3 p-4 sm:p-5 pb-3">
        {item.authorImage ? (
          <img src={item.authorImage} alt="" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover ring-1 ring-zinc-700" />
        ) : (
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-red-400 ring-1 ring-zinc-700 text-sm">
            {item.authorName?.charAt(0)?.toUpperCase() || 'S'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-100">{item.authorName || 'SpeedHype Paddock'}</p>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`font-semibold ${meta.accent}`}>{meta.label}</span>
            <span className="text-zinc-400">· {timeAgo(item.createdAt)}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${meta.badgeBg}`}>
          {item.type.toUpperCase()}
        </span>
      </div>

      <Link to={item.href} className="block">
        {item.image && (
          <div className="aspect-[16/8] sm:aspect-[16/8] overflow-hidden bg-zinc-950">
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <div className="p-4 sm:p-5 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              {item.category}
            </span>
            {item.type === 'community' && (
              <span className="text-xs text-zinc-400 font-medium">
                {item.memberCount} members
              </span>
            )}
          </div>
          <h2 className="mt-2.5 text-lg sm:text-xl font-bold leading-snug text-white group-hover:text-red-300 transition-colors">
            {item.title}
          </h2>
          {item.description && (
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
              {item.description}
            </p>
          )}
          <span className="mt-4 inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-red-400 group-hover:text-red-300">
            Explore Details <span aria-hidden="true" className="transform transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </Link>
    </article>
  )
}


const FeedPage = () => {
  const { getToken } = useAuth()
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadFeed = useCallback(async (active = () => true) => {
    try {
      const response = await authenticatedRequest(getToken, 'GET', '/feed')
      if (active()) {
        setFeed(response.data)
        setError('')
      }
    } catch (requestError) {
      if (active()) setError(requestError.response?.data?.message || 'Your feed could not be loaded.')
    } finally {
      if (active()) setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    let active = true
    const initialLoad = window.setTimeout(() => loadFeed(() => active), 0)
    const interval = window.setInterval(() => loadFeed(() => active), 60000)
    return () => {
      active = false
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [loadFeed, refreshKey])

  const refreshFeed = () => {
    setLoading(true)
    setRefreshKey((value) => value + 1)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative mb-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/30 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-24 h-80 w-80 rounded-full bg-red-600/15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-900/60 bg-red-950/50 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              The Automotive Pulse
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Your <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">SpeedHype</span> Feed
            </h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-400">
              Live updates, garage builds, community paddocks, and verified machines entering the database.
            </p>
          </div>
          <button
            onClick={refreshFeed}
            className="self-start sm:self-auto rounded-xl border border-zinc-700/80 bg-zinc-950/70 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="text-red-400">↻</span> Refresh feed
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900/80 bg-red-950/50 p-4 text-sm text-red-200">
          <span>{error}</span>
          <button onClick={refreshFeed} className="font-semibold underline hover:text-white">Try again</button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">Latest Paddock Updates</h2>
            <span className="text-xs text-zinc-400">Auto-refreshes every 60s</span>
          </div>

          {loading ? (
            <div className="space-y-4" aria-label="Loading feed">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-64 sm:h-72 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" />
              ))}
            </div>
          ) : feed?.items?.length ? (
            <div className="space-y-5">
              {feed.items.map((item) => <FeedItem key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-xl text-red-400 mb-3">
                🏁
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">Your feed is ready for its first lap.</h3>
              <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto">New stories, community discussions, and verified car launches will stream in here.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link to="/blogs/new" className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors shadow-sm">
                  + Write a story
                </Link>
                <Link to="/communities/new" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-200 hover:bg-zinc-800 transition-colors">
                  Create community
                </Link>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24">
          {/* Trending Topics Paddock */}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">The Paddock</p>
                <h2 className="mt-0.5 text-base font-bold text-white">Trending Topics</h2>
              </div>
              <span className="text-xs font-bold text-zinc-400">#TAGS</span>
            </div>
            {loading ? (
              <div className="mt-4 h-28 animate-pulse rounded-xl bg-zinc-800/60" />
            ) : feed?.trendingTopics?.length ? (
              <ol className="mt-3 divide-y divide-zinc-800/50">
                {feed.trendingTopics.map((topic, index) => (
                  <li key={topic.tag} className="flex items-center justify-between gap-3 py-2.5 px-1 hover:bg-zinc-800/40 rounded-lg transition-colors">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-red-400">0{index + 1}</span>
                      <span className="truncate text-sm font-semibold text-zinc-200">#{topic.tag}</span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400 font-medium">
                      {topic.postCount} {topic.postCount === 1 ? 'story' : 'stories'}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-xs text-zinc-400">Topics will appear as more stories are posted.</p>
            )}
          </section>

          {/* Suggested Communities */}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5">
            <div className="pb-3 border-b border-zinc-800/60">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Find Your Crew</p>
              <h2 className="mt-0.5 text-base font-bold text-white">Suggested Communities</h2>
            </div>
            {loading ? (
              <div className="mt-4 h-28 animate-pulse rounded-xl bg-zinc-800/60" />
            ) : feed?.suggestedCommunities?.length ? (
              <div className="mt-3 space-y-2.5">
                {feed.suggestedCommunities.map((community) => (
                  <Link
                    key={community.id}
                    to={community.href}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-zinc-800/60 group"
                  >
                    {community.coverImage ? (
                      <img src={community.coverImage} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-zinc-700" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-700 to-zinc-800 text-sm font-black text-white">
                        {community.name.charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-zinc-200 group-hover:text-red-300 transition-colors">
                        {community.name}
                      </span>
                      <span className="block text-xs text-zinc-400 font-medium">
                        {community.category} · {community.memberCount} members
                      </span>
                    </span>
                    <span className="text-zinc-400 text-sm transform transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-zinc-400">You’re a member of every suggested community.</p>
            )}
            <Link to="/communities" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300">
              Explore all communities <span>→</span>
            </Link>
          </section>

          {/* Platform Stats Widget */}
          <section className="rounded-2xl border border-red-950/80 bg-gradient-to-br from-red-950/40 via-zinc-900 to-zinc-900 p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Telemetry Summary</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">Network activity across verified machines and stories.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['Stories', feed?.counts?.blogs],
                ['Crews', feed?.counts?.communities],
                ['Launches', feed?.counts?.vehicles],
              ].map(([label, count]) => (
                <div key={label} className="rounded-xl border border-zinc-800/80 bg-black/40 p-2.5 text-center">
                  <p className="text-base sm:text-lg font-black text-white tabular-nums">{count ?? '—'}</p>
                  <p className="text-[10px] font-semibold text-zinc-400">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default FeedPage

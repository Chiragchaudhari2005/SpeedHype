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
  blog: { label: 'New story', icon: '✎', accent: 'text-red-300' },
  community: { label: 'New community', icon: '◎', accent: 'text-orange-300' },
  vehicle: { label: 'New car launch', icon: '↗', accent: 'text-emerald-300' },
}

function FeedItem({ item }) {
  const meta = itemMeta[item.type]
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-3 p-5">
        {item.authorImage ? (
          <img src={item.authorImage} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-red-300">{item.authorName?.charAt(0)?.toUpperCase() || 'S'}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-100">{item.authorName || 'SpeedHype'}</p>
          <p className={`text-xs ${meta.accent}`}>{meta.label} <span className="text-zinc-500">· {timeAgo(item.createdAt)}</span></p>
        </div>
        <span className="text-xl text-zinc-500" aria-hidden="true">{meta.icon}</span>
      </div>
      <Link to={item.href} className="block">
        {item.image && (
          <div className="aspect-[16/8] overflow-hidden bg-zinc-950">
            <img src={item.image} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]" />
          </div>
        )}
        <div className="p-5 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-300">{item.category}</span>
            {item.type === 'community' && <span className="text-xs text-zinc-500">{item.memberCount} members</span>}
          </div>
          <h2 className="mt-3 text-xl font-bold leading-snug text-white hover:text-red-300">{item.title}</h2>
          {item.description && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-zinc-400">{item.description}</p>}
          <span className="mt-4 inline-flex text-sm font-bold text-red-400">Explore <span className="ml-1" aria-hidden="true">↗</span></span>
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
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-9 sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-14 -top-24 h-80 w-80 rounded-full bg-red-600/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">The automotive pulse</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Your <span className="text-red-500">SpeedHype</span> feed</h1>
            <p className="mt-3 max-w-xl leading-7 text-zinc-400">Fresh stories, new crews, and the latest machines entering the garage.</p>
          </div>
          <button onClick={refreshFeed} className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500">Refresh feed</button>
        </div>
      </section>

      {error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
          {error}
          <button onClick={refreshFeed} className="font-semibold underline">Try again</button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Latest updates</h2>
            <span className="text-xs text-zinc-500">Auto-refreshes every minute</span>
          </div>
          {loading ? (
            <div className="space-y-5" aria-label="Loading feed">
              {[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />)}
            </div>
          ) : feed?.items?.length ? (
            <div className="space-y-5">
              {feed.items.map((item) => <FeedItem key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-16 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Fresh tarmac</p>
              <h3 className="mt-3 text-xl font-bold">Your feed is ready for its first update.</h3>
              <p className="mt-2 text-sm text-zinc-400">New blog posts, communities, and car launches will show up here.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link to="/blogs/new" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500">Write a story</Link>
                <Link to="/communities/new" className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-800">Create community</Link>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">The paddock</p>
                <h2 className="mt-1 text-lg font-bold">Trending topics</h2>
              </div>
              <span className="text-lg text-red-400" aria-hidden="true">↗</span>
            </div>
            {loading ? <div className="mt-4 h-32 animate-pulse rounded-xl bg-zinc-800" /> : feed?.trendingTopics?.length ? (
              <ol className="mt-4 space-y-1">
                {feed.trendingTopics.map((topic, index) => (
                  <li key={topic.tag} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-800">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-xs font-bold text-zinc-600">0{index + 1}</span>
                      <span className="truncate font-semibold text-zinc-200">#{topic.tag}</span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">{topic.postCount} {topic.postCount === 1 ? 'story' : 'stories'}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-4 text-sm text-zinc-500">Topics will trend as more stories are published.</p>}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Find your crew</p>
              <h2 className="mt-1 text-lg font-bold">Suggested communities</h2>
            </div>
            {loading ? <div className="mt-4 h-32 animate-pulse rounded-xl bg-zinc-800" /> : feed?.suggestedCommunities?.length ? (
              <div className="mt-4 space-y-3">
                {feed.suggestedCommunities.map((community) => (
                  <Link key={community.id} to={community.href} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-zinc-800">
                    {community.coverImage ? (
                      <img src={community.coverImage} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-700 to-zinc-800 text-lg font-black text-white">{community.name.charAt(0)}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-zinc-200">{community.name}</span>
                      <span className="block text-xs text-zinc-500">{community.category} · {community.memberCount} members</span>
                    </span>
                    <span className="text-zinc-500" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            ) : <p className="mt-4 text-sm text-zinc-500">You’re caught up on every community. Nice.</p>}
            <Link to="/communities" className="mt-4 inline-flex text-sm font-bold text-red-400 hover:text-red-300">Explore all communities →</Link>
          </section>

          <section className="rounded-2xl border border-red-950 bg-gradient-to-br from-red-950/60 to-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Your SpeedHype</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Stories and garages added by the community, all in one place.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['Stories', feed?.counts?.blogs],
                ['Crews', feed?.counts?.communities],
                ['Launches', feed?.counts?.vehicles],
              ].map(([label, count]) => (
                <div key={label} className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                  <p className="text-lg font-black">{count ?? '—'}</p>
                  <p className="text-[11px] text-zinc-500">{label}</p>
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

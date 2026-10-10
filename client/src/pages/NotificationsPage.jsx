import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const getLabel = (type) => (
  type === 'blog' ? 'New story'
    : type === 'community' ? 'New community'
      : 'New car launch'
)

const NotificationsPage = () => {
  const { getToken } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const load = useCallback(async () => {
    try {
      const response = await authenticatedRequest(getToken, 'GET', '/feed/notifications')
      setItems(response.data.notifications)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Notifications could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    const timer = window.setTimeout(load, 0)
    return () => window.clearTimeout(timer)
  }, [load, retryKey])

  const retry = () => {
    setLoading(true)
    setRetryKey((value) => value + 1)
  }

  const markAllRead = async () => {
    try {
      await authenticatedRequest(getToken, 'POST', '/feed/notifications/read')
      setItems((existing) => existing.map((item) => ({ ...item, unread: false })))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Notifications could not be marked as read.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/feed" className="text-sm font-semibold text-zinc-500 hover:text-white">← Back to feed</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-red-400">Your garage activity</p>
          <h1 className="mt-2 text-4xl font-black">Notifications</h1>
          <p className="mt-2 text-zinc-400">The latest stories, communities, and cars added to SpeedHype.</p>
        </div>
        {items.some((item) => item.unread) && (
          <button onClick={markAllRead} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">Mark all as read</button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
          {error}
          <button onClick={retry} className="font-semibold underline">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading notifications">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />)}
        </div>
      ) : items.length ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          {items.map((item) => (
            <Link key={item.id} to={item.href} className={`flex gap-4 border-b border-zinc-800 p-4 transition last:border-0 hover:bg-zinc-800/60 sm:p-5 ${item.unread ? 'bg-red-950/10' : ''}`}>
              {item.image ? (
                <img src={item.image} alt="" className="h-16 w-20 shrink-0 rounded-lg bg-zinc-800 object-cover sm:h-20 sm:w-28" />
              ) : (
                <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl sm:h-20 sm:w-20 ${item.type === 'blog' ? 'bg-red-950/70 text-red-300' : item.type === 'community' ? 'bg-orange-950/70 text-orange-300' : 'bg-emerald-950/70 text-emerald-300'}`}>
                  {item.type === 'blog' ? '✎' : item.type === 'community' ? '◎' : '↗'}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-300">{getLabel(item.type)}</span>
                  {item.unread && <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label="Unread" />}
                </span>
                <span className="mt-1 block truncate text-lg font-bold text-white">{item.title}</span>
                {item.description && <span className="mt-1 line-clamp-2 block text-sm leading-5 text-zinc-400">{item.description}</span>}
                <span className="mt-2 block text-xs text-zinc-500">{item.authorName ? `By ${item.authorName} · ` : ''}{new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(item.createdAt))}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">All quiet in the paddock</p>
          <h2 className="mt-3 text-2xl font-bold">No notifications yet.</h2>
          <p className="mt-2 text-zinc-400">Updates about new blogs, communities, and car launches will show up here.</p>
          <Link to="/feed" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">Explore your feed</Link>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage

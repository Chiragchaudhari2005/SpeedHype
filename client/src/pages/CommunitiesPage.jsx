import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const categories = ['Cars', 'Bikes', 'EVs', 'Modifications', 'Racing', 'Restoration', 'Off-road', 'General']

const CommunitiesPage = () => {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [communities, setCommunities] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [view, setView] = useState('discover')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [pendingId, setPendingId] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedRequest(getToken, 'GET', '/communities', null, {
          params: { search, category, mine: String(view === 'joined') },
        })
        if (active) setCommunities(response.data.communities)
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Communities could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }, search ? 250 : 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [category, getToken, retryCount, search, view])

  const toggleMembership = async (community) => {
    setPendingId(community._id)
    setNotice('')
    setError('')
    try {
      const response = await authenticatedRequest(
        getToken,
        'POST',
        `/communities/${community._id}/${community.isMember ? 'leave' : 'join'}`,
        { displayName: user?.fullName || 'SpeedHype member', imageUrl: user?.imageUrl || '' },
      )
      if (view === 'joined' && !response.data.community.isMember) {
        setCommunities((items) => items.filter((item) => item._id !== community._id))
      } else {
        setCommunities((items) => items.map((item) => (
          item._id === community._id ? response.data.community : item
        )))
      }
      setNotice(response.data.community.isMember ? `Joined ${community.name}.` : `Left ${community.name}.`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Membership could not be updated.')
    } finally {
      setPendingId('')
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-9 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">Find your people</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Built around <span className="text-red-500">what you drive.</span></h1>
            <p className="mt-4 max-w-xl leading-7 text-zinc-400">
              Join the garages, paddocks, and group rides where the best automotive conversations happen.
            </p>
          </div>
          <Link to="/communities/new" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-950/40 hover:brightness-110">
            <span className="text-xl leading-none">+</span> Create community
          </Link>
        </div>
      </section>

      <section className="mb-7 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-[minmax(0,1fr)_210px] sm:p-5">
        <label className="relative">
          <span className="sr-only">Search communities</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search communities"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-4 text-white outline-none placeholder:text-zinc-500 focus:border-red-500"
          />
        </label>
        <label>
          <span className="sr-only">Filter community category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          <button onClick={() => setView('discover')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'discover' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
            Discover
          </button>
          <button onClick={() => setView('joined')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === 'joined' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>
            Joined
          </button>
        </div>
        <p className="text-sm text-zinc-500">{communities.length} {communities.length === 1 ? 'community' : 'communities'}</p>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
          <button onClick={() => setRetryCount((count) => count + 1)} className="font-semibold underline">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading communities">
          {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />)}
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">{view === 'joined' ? 'Your garage is waiting' : 'No communities found'}</p>
          <h2 className="mt-3 text-2xl font-bold">{view === 'joined' ? 'Join a community to get in on the conversation.' : 'Be the first to start this conversation.'}</h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-400">{view === 'joined' ? 'Explore groups for your favorite vehicles and interests.' : 'Try another search or create a community around your automotive passion.'}</p>
          <Link to="/communities/new" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">Create a community</Link>
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3">
          {communities.map((community) => (
            <article key={community._id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-600">
              <Link to={`/communities/${community._id}`} className="relative block aspect-[16/8] overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-red-950">
                {community.coverImage?.url ? (
                  <img src={community.coverImage.url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-end p-5"><span className="text-7xl font-black italic tracking-tighter text-white/10">SH</span></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">{community.category}</span>
              </Link>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <Link to={`/communities/${community._id}`} className="text-xl font-bold text-white hover:text-red-300">{community.name}</Link>
                <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-400">{community.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                  <div>
                    <p className="text-lg font-bold text-white">{community.memberCount ?? community.members?.length ?? 0}</p>
                    <p className="text-xs text-zinc-500">members</p>
                  </div>
                  <div className="flex -space-x-2">
                    {community.members?.slice(0, 4).map((member) => (
                      member.imageUrl
                        ? <img key={member.userId} src={member.imageUrl} alt="" title={member.displayName} className="h-8 w-8 rounded-full border-2 border-zinc-900 object-cover" />
                        : <span key={member.userId} title={member.displayName} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-700 text-xs font-bold text-zinc-200">{member.displayName?.charAt(0)?.toUpperCase() || 'S'}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <Link to={`/communities/${community._id}`} className="flex-1 rounded-xl border border-zinc-700 px-4 py-2.5 text-center text-sm font-semibold text-zinc-200 hover:bg-zinc-800">Open community</Link>
                  <button
                    disabled={pendingId === community._id}
                    onClick={() => toggleMembership(community)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${community.isMember ? 'border border-zinc-700 text-zinc-300 hover:border-red-900 hover:text-red-300' : 'bg-red-600 text-white hover:bg-red-500'}`}
                  >
                    {pendingId === community._id ? '…' : community.isMember ? 'Leave' : 'Join'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default CommunitiesPage

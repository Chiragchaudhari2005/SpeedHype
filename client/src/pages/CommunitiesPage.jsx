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
      <section className="relative mb-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900 to-orange-950/30 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-orange-900/60 bg-orange-950/50 text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              Find Your Crew
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Built Around <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">What You Drive.</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm sm:text-base leading-relaxed text-zinc-400">
              Join the paddocks, track day crews, and garage clubs where the real conversations happen.
            </p>
          </div>
          <Link
            to="/communities/new"
            className="self-start md:self-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-950/40 hover:brightness-110 transition-transform hover:scale-[1.02]"
          >
            <span className="text-lg leading-none">+</span> Create community
          </Link>
        </div>
      </section>

      <section className="mb-6 grid gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3.5 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-4">
        <label className="relative">
          <span className="sr-only">Search communities</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search communities by name or discipline…"
            className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 py-2.5 sm:py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500 transition-all"
          />
        </label>
        <label>
          <span className="sr-only">Filter community category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white outline-none focus:border-red-500 transition-all"
          >
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-1">
          <button
            onClick={() => setView('discover')}
            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all ${
              view === 'discover'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setView('joined')}
            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all ${
              view === 'joined'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Joined
          </button>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 font-medium">
          {communities.length} {communities.length === 1 ? 'community' : 'communities'}
        </p>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button onClick={() => setRetryCount((count) => count + 1)} className="font-semibold underline">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading communities">
          {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" />)}
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">{view === 'joined' ? 'Your garage is waiting' : 'No communities found'}</p>
          <h2 className="mt-3 text-xl sm:text-2xl font-bold text-white">{view === 'joined' ? 'Join a community to get in on the conversation.' : 'Be the first to start this conversation.'}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{view === 'joined' ? 'Explore groups for your favorite vehicles and interests.' : 'Try another search or create a community around your automotive passion.'}</p>
          <Link to="/communities/new" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 shadow-sm">Create a community</Link>
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3">
          {communities.map((community) => (
            <article
              key={community._id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900 shadow-sm"
            >
              <Link to={`/communities/${community._id}`} className="relative block aspect-[16/8] overflow-hidden bg-zinc-950">
                {community.coverImage?.url ? (
                  <img src={community.coverImage.url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-end p-5 bg-gradient-to-br from-zinc-800 via-zinc-900 to-orange-950">
                    <span className="text-6xl font-black italic tracking-tighter text-white/10">SH</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-md border border-white/15 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  {community.category}
                </span>
              </Link>

              <div className="flex flex-1 flex-col p-5">
                <Link to={`/communities/${community._id}`} className="text-lg font-bold text-white hover:text-red-300 transition-colors">
                  {community.name}
                </Link>
                <p className="mt-2 line-clamp-3 min-h-[4rem] text-xs sm:text-sm leading-relaxed text-zinc-400">
                  {community.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <div>
                    <p className="text-base font-bold text-white tabular-nums">{community.memberCount ?? community.members?.length ?? 0}</p>
                    <p className="text-[11px] text-zinc-400">members</p>
                  </div>
                  <div className="flex -space-x-2">
                    {community.members?.slice(0, 4).map((member) => (
                      member.imageUrl
                        ? <img key={member.userId} src={member.imageUrl} alt="" title={member.displayName} className="h-7 w-7 rounded-full border-2 border-zinc-900 object-cover" />
                        : <span key={member.userId} title={member.displayName} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-[10px] font-bold text-zinc-200">{member.displayName?.charAt(0)?.toUpperCase() || 'S'}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex gap-2 pt-1">
                  <Link
                    to={`/communities/${community._id}`}
                    className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-800/60 px-3 py-2 text-center text-xs font-bold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    Open
                  </Link>
                  <button
                    disabled={pendingId === community._id}
                    onClick={() => toggleMembership(community)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50 transition-colors ${
                      community.isMember
                        ? 'border border-zinc-700/80 text-zinc-400 hover:border-red-900 hover:text-red-300 hover:bg-red-950/20'
                        : 'bg-red-600 text-white hover:bg-red-500 shadow-sm'
                    }`}
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

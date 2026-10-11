import { useCallback, useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const formatPrice = (amount, currency = '') => {
  if (amount == null) return 'Price not listed'
  if (!currency) return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export default function DashboardPage() {
  const { getToken } = useAuth()
  const { user } = useUser()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState({
    stats: { blogsCount: 0, communitiesCount: 0, vehiclesCount: 0, catalogCarsCount: 0 },
    userBlogs: [],
    userCommunities: [],
    userVehicles: [],
    recentApprovedCars: [],
    recentActivities: [],
  })

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await authenticatedRequest(getToken, 'GET', '/feed/dashboard')
      if (response.data) {
        setDashboardData({
          stats: response.data.stats || { blogsCount: 0, communitiesCount: 0, vehiclesCount: 0, catalogCarsCount: 0 },
          userBlogs: response.data.userBlogs || [],
          userCommunities: response.data.userCommunities || [],
          userVehicles: response.data.userVehicles || [],
          recentApprovedCars: response.data.recentApprovedCars || [],
          recentActivities: response.data.recentActivities || [],
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  const { stats, userBlogs, userCommunities, userVehicles, recentApprovedCars, recentActivities } = dashboardData
  const displayName = user?.firstName || user?.fullName || user?.username || 'Enthusiast'

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-red-950/30 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-red-500/60 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 text-2xl font-black text-white shadow-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-red-950 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-400 border border-red-800/60">
                  SpeedHype Garage Member
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                Welcome back, {displayName}!
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Your personal automotive hub. Track your stories, communities, and verified vehicle data.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/blogs/new"
              className="rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:brightness-110 shadow-sm"
            >
              + Write Story
            </Link>
            <Link
              to="/communities/new"
              className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
            >
              + Create Community
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Real Numerical Stats Grid */}
      <section aria-label="Personal Statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Your Stories */}
        <Link
          to="/blogs"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 hover:bg-zinc-850"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Your Stories</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/10 text-red-500 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-black text-white">
            {loading ? '…' : stats.blogsCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Published articles &amp; builds</p>
        </Link>

        {/* Your Communities */}
        <Link
          to="/communities"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 hover:bg-zinc-850"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Communities</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600/10 text-orange-500 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0a5 5 0 00-7.742-.742" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-black text-white">
            {loading ? '…' : stats.communitiesCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Groups you joined or lead</p>
        </Link>

        {/* Your Garage */}
        <Link
          to="/cars"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 hover:bg-zinc-850"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Your Garage</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-black text-white">
            {loading ? '…' : stats.vehiclesCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Community launches added</p>
        </Link>

        {/* Verified Cars in Database */}
        <Link
          to="/cars"
          className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 hover:bg-zinc-850"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Verified Database</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-400">
            {loading ? '…' : stats.catalogCarsCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Approved specs with attribution</p>
        </Link>
      </section>

      {/* Quick Nav Bar */}
      <section aria-label="Quick Hub">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Quick Navigation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Feed', desc: 'Live enthusiast feed', color: 'from-red-600 to-rose-600', path: '/feed', icon: '⚡' },
            { name: 'Car Database', desc: 'Sourced specifications', color: 'from-amber-600 to-orange-600', path: '/cars', icon: '🏎️' },
            { name: 'Comparison', desc: 'Side-by-side duel', color: 'from-emerald-600 to-teal-600', path: '/compare', icon: '⚖️' },
            { name: 'Communities', desc: 'Niche enthusiast clubs', color: 'from-blue-600 to-cyan-600', path: '/communities', icon: '👥' },
            { name: 'Blogs & Stories', desc: 'Guides and reviews', color: 'from-purple-600 to-indigo-600', path: '/blogs', icon: '📰' },
            { name: 'Profile Settings', desc: 'Clerk account & prefs', color: 'from-zinc-700 to-zinc-800', path: '/profile', icon: '⚙️' },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 transition hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-850"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">→</span>
              </div>
              <div className="mt-3">
                <p className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{item.name}</p>
                <p className="text-[11px] text-zinc-500 truncate">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Main Content Grid: Your Content & Real Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols on lg): Your Communities & Stories */}
        <div className="lg:col-span-2 space-y-8">
          {/* Your Communities Section */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Your Communities</h2>
                <p className="text-xs text-zinc-400">Groups you are currently participating in.</p>
              </div>
              <Link to="/communities" className="text-xs font-bold text-red-400 hover:text-red-300">
                Explore all →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-800" />
                ))}
              </div>
            ) : userCommunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
                <p className="text-sm text-zinc-400">You haven&apos;t joined any communities yet.</p>
                <Link
                  to="/communities"
                  className="mt-3 inline-block rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700"
                >
                  Join a Community
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userCommunities.map((community) => (
                  <Link
                    key={community._id}
                    to={`/communities/${community._id}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 transition hover:border-zinc-700 hover:bg-zinc-950"
                  >
                    {community.coverImage?.url ? (
                      <img
                        src={community.coverImage.url}
                        alt={community.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-950/40 text-orange-400 font-black text-lg border border-orange-800/40">
                        {community.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate">{community.name}</p>
                      <p className="text-xs text-zinc-500">
                        {community.category} · {community.members?.length || 1} members
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Your Stories & Articles Section */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Your Stories &amp; Articles</h2>
                <p className="text-xs text-zinc-400">Articles and build stories you authored.</p>
              </div>
              <Link to="/blogs/new" className="text-xs font-bold text-red-400 hover:text-red-300">
                + Write new →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800" />
                ))}
              </div>
            ) : userBlogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
                <p className="text-sm text-zinc-400">You haven&apos;t published any stories or articles yet.</p>
                <Link
                  to="/blogs/new"
                  className="mt-3 inline-block rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
                >
                  Write Your First Story
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {userBlogs.map((blog) => (
                  <Link
                    key={blog._id}
                    to={`/blogs/${blog._id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 transition hover:border-zinc-700 hover:bg-zinc-950"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase font-bold text-zinc-400">
                          {blog.category}
                        </span>
                        <span className="text-xs text-zinc-500">{formatTimeAgo(blog.createdAt)}</span>
                      </div>
                      <p className="mt-1 font-bold text-white text-sm truncate">{blog.title}</p>
                    </div>
                    <span className="text-xs text-red-400 font-semibold shrink-0">Read story →</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Your Garage / Community Launches */}
          {userVehicles.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Your Community Launches</h2>
                  <p className="text-xs text-zinc-400">Vehicles you added to the community directory.</p>
                </div>
                <Link to="/cars/new" className="text-xs font-bold text-red-400 hover:text-red-300">
                  + Add another →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userVehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5"
                  >
                    {vehicle.imageUrl ? (
                      <img
                        src={vehicle.imageUrl}
                        alt={vehicle.model}
                        className="h-12 w-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-14 items-center justify-center rounded-lg bg-zinc-900 font-black text-zinc-600">
                        {vehicle.make.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-sm truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-zinc-500">{vehicle.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Real Activity Feed & Latest Database Cars */}
        <div className="space-y-8">
          {/* Real Recent Activity Feed */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Recent Activity</h2>
              <span className="text-xs text-zinc-500">Live feed</span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-zinc-800" />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${activity.isOwn ? 'bg-red-500' : 'bg-emerald-400'}`} />
                      <div className="min-w-0">
                        {activity.href ? (
                          <Link
                            to={activity.href}
                            className="text-xs font-semibold text-zinc-200 hover:text-white line-clamp-2"
                          >
                            {activity.action}
                          </Link>
                        ) : (
                          <p className="text-xs font-semibold text-zinc-200 line-clamp-2">{activity.action}</p>
                        )}
                        <span className="text-[11px] text-zinc-500">{formatTimeAgo(activity.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Latest Verified Database Cars */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Verified Cars Catalog</h2>
                <p className="text-xs text-zinc-400">Recently verified additions.</p>
              </div>
              <Link to="/cars" className="text-xs font-bold text-red-400 hover:text-red-300">
                View catalog →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-800" />
                ))}
              </div>
            ) : recentApprovedCars.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No verified cars available yet.</p>
            ) : (
              <div className="space-y-3">
                {recentApprovedCars.map((car) => (
                  <Link
                    key={car._id}
                    to={`/cars/catalog/${car._id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 transition hover:border-zinc-700 hover:bg-zinc-950"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">
                          {car.brand} {car.model}
                        </span>
                        <span className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] uppercase font-bold text-zinc-400">
                          {car.launchYear}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                        {formatPrice(car.priceAmount, car.priceCurrency)}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400 hover:text-white">Specs →</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
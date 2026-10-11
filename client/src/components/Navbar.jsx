import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth, UserButton } from '@clerk/react'
import { Link, useLocation } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import speedhypeLogo from '../assets/speedhype logo.png'

const notificationLink = (item) => item.href || '/feed'
const notificationLabel = (type) => (
  type === 'blog' ? 'New story'
    : type === 'community' ? 'New community'
      : 'New car launch'
)

const navItems = [
  { path: '/feed', label: 'Feed' },
  { path: '/communities', label: 'Communities' },
  { path: '/blogs', label: 'Blogs' },
  { path: '/cars', label: 'Cars' },
  { path: '/compare', label: 'Compare' },
  { path: '/dashboard', label: 'Dashboard' },
]

const Navbar = () => {
  const { isSignedIn, getToken } = useAuth()
  const location = useLocation()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const notifRef = useRef(null)

  const loadNotifications = useCallback(async () => {
    try {
      const response = await authenticatedRequest(getToken, 'GET', '/feed/notifications')
      setNotifications(response.data.notifications)
      setUnreadCount(response.data.unreadCount)
      setNotificationsError('')
    } catch (error) {
      setNotificationsError(error.response?.data?.message || 'Notifications could not be loaded.')
    }
  }, [getToken])

  useEffect(() => {
    if (!isSignedIn) return undefined
    const initialLoad = window.setTimeout(loadNotifications, 0)
    const interval = window.setInterval(loadNotifications, 60000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [isSignedIn, loadNotifications])

  // Close menus on route change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMobileMenuOpen(false)
      setNotificationsOpen(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [notificationsOpen])

  const openNotifications = async () => {
    const willOpen = !notificationsOpen
    setNotificationsOpen(willOpen)
    if (willOpen) setMobileMenuOpen(false)
    if (!willOpen) return
    await loadNotifications()
    try {
      await authenticatedRequest(getToken, 'POST', '/feed/notifications/read')
      setUnreadCount(0)
      setNotifications((items) => items.map((item) => ({ ...item, unread: false })))
    } catch (error) {
      setNotificationsError(error.response?.data?.message || 'Notifications could not be marked as read.')
    }
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-17">
          {/* Brand Logo */}
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center gap-2 group py-1">
              <img
                src={speedhypeLogo}
                alt="SpeedHype"
                className="h-9 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          {isSignedIn && (
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-red-950/70 text-red-400 border border-red-800/60 shadow-sm'
                        : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right Section: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {isSignedIn ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={notificationsOpen}
                    onClick={openNotifications}
                    className="relative flex h-9.5 w-9.5 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute 0 top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-zinc-950">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Panel */}
                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-[60] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/90">
                        <div>
                          <p className="font-bold text-white text-sm">Notifications</p>
                          <p className="text-xs text-zinc-400">{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
                        </div>
                        <Link onClick={() => setNotificationsOpen(false)} to="/notifications" className="text-xs font-semibold text-red-400 hover:text-red-300">
                          View all
                        </Link>
                      </div>
                      {notificationsError ? (
                        <div className="p-4 text-xs text-red-300">{notificationsError}</div>
                      ) : notifications.length ? (
                        <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-zinc-800/60">
                          {notifications.slice(0, 8).map((item) => (
                            <Link
                              key={item.id}
                              to={notificationLink(item)}
                              onClick={() => setNotificationsOpen(false)}
                              className="flex gap-3 px-4 py-3 transition hover:bg-zinc-800/70"
                            >
                              <span className={`mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                item.type === 'blog' ? 'bg-red-950 text-red-300 border border-red-800/60'
                                  : item.type === 'community' ? 'bg-orange-950 text-orange-300 border border-orange-800/60'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              }`}>
                                {item.type === 'blog' ? '✎' : item.type === 'community' ? '◎' : '↗'}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{notificationLabel(item.type)}</span>
                                <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-100">{item.title}</span>
                                <span className="mt-0.5 block text-[11px] text-zinc-400">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.createdAt))}</span>
                              </span>
                              {item.unread && <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-sm" />}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-zinc-400">New stories, communities, and cars will appear here.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar Button */}
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8 sm:w-8.5 sm:h-8.5 ring-1 ring-zinc-700 hover:ring-red-500 transition-all rounded-full'
                    }
                  }}
                />

                {/* Mobile Menu Hamburger Toggle Button */}
                <button
                  type="button"
                  aria-label="Toggle mobile menu"
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-700 focus:outline-none"
                >
                  {mobileMenuOpen ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="hidden sm:inline-block text-zinc-300 hover:text-white text-sm font-medium px-2 py-1"
                >
                  Home
                </Link>
                <Link
                  to="/sign-in"
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-red-950/50"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isSignedIn && mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950/98 px-4 pt-3 pb-5 space-y-1 shadow-2xl backdrop-blur-xl">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Navigation</p>
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-red-950/80 text-red-300 border border-red-800/70 shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-200 border border-zinc-800/60 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>SpeedHype Automotive Network</span>
            <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className="text-red-400 font-semibold hover:underline">
              Notifications ({unreadCount})
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
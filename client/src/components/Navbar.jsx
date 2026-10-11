import { useCallback, useEffect, useState } from 'react'
import { useAuth, UserButton } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import speedhypeLogo from '../assets/speedhype logo.png'

const notificationLink = (item) => item.href || '/feed'
const notificationLabel = (type) => (
  type === 'blog' ? 'New story'
    : type === 'community' ? 'New community'
      : 'New car launch'
)

const Navbar = () => {
  const { isSignedIn, getToken } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')

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

  const openNotifications = async () => {
    const willOpen = !notificationsOpen
    setNotificationsOpen(willOpen)
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

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src={speedhypeLogo}
                alt="SpeedHype"
                className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            {isSignedIn ? (
              <>
                <Link 
                  to="/feed" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Feed
                </Link>
                <Link 
                  to="/communities" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Communities
                </Link>
                <Link 
                  to="/blogs" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Blogs
                </Link>
                <Link 
                  to="/cars" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Cars
                </Link>
                <Link 
                  to="/compare" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Compare
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                    aria-expanded={notificationsOpen}
                    onClick={openNotifications}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                    </svg>
                    {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-[60] w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
                      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                        <div>
                          <p className="font-bold text-white">Notifications</p>
                          <p className="text-xs text-zinc-500">{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p>
                        </div>
                        <Link onClick={() => setNotificationsOpen(false)} to="/notifications" className="text-xs font-semibold text-red-400 hover:text-red-300">View all</Link>
                      </div>
                      {notificationsError ? (
                        <div className="p-4 text-sm text-red-300">{notificationsError}</div>
                      ) : notifications.length ? (
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.slice(0, 8).map((item) => (
                            <Link
                              key={item.id}
                              to={notificationLink(item)}
                              onClick={() => setNotificationsOpen(false)}
                              className="flex gap-3 border-b border-zinc-800/70 px-4 py-3 transition hover:bg-zinc-800/70"
                            >
                              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.type === 'blog' ? 'bg-red-950 text-red-300' : item.type === 'community' ? 'bg-orange-950 text-orange-300' : 'bg-emerald-950 text-emerald-300'}`}>
                                {item.type === 'blog' ? '✎' : item.type === 'community' ? '◎' : '↗'}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{notificationLabel(item.type)}</span>
                                <span className="mt-0.5 block truncate text-sm font-semibold text-zinc-100">{item.title}</span>
                                <span className="mt-0.5 block text-xs text-zinc-500">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(item.createdAt))}</span>
                              </span>
                              {item.unread && <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-sm text-zinc-500">New stories and communities will appear here.</div>
                      )}
                    </div>
                  )}
                </div>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8'
                    }
                  }}
                />
              </>
            ) : (
              <>
                <Link 
                  to="/" 
                  className="text-zinc-300 hover:text-white transition-colors font-medium"
                >
                  Home
                </Link>
                <Link 
                  to="/sign-in" 
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/sign-up" 
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
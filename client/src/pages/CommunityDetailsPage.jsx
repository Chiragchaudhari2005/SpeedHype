import { useEffect, useRef, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { authenticatedRequest } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const SOCKET_URL = new URL(API_BASE_URL, window.location.origin).origin
const MEDIA_LIMIT = 12 * 1024 * 1024
const formatDate = (date) => new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(date))

const CommunityDetailsPage = () => {
  const { communityId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [community, setCommunity] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [sending, setSending] = useState(false)
  const [socketStatus, setSocketStatus] = useState('connecting')
  const [membershipPending, setMembershipPending] = useState(false)
  const socketRef = useRef(null)
  const messageListRef = useRef(null)

  useEffect(() => {
    let active = true
    const loadCommunity = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedRequest(getToken, 'GET', `/communities/${communityId}`)
        const loadedCommunity = response.data.community
        if (!active) return
        setCommunity(loadedCommunity)
        if (loadedCommunity.isMember) {
          const messagesResponse = await authenticatedRequest(getToken, 'GET', `/communities/${communityId}/messages`)
          if (active) setMessages(messagesResponse.data.messages)
        } else {
          setMessages([])
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Community could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCommunity()
    return () => { active = false }
  }, [communityId, getToken])

  useEffect(() => {
    if (!community?._id || !community.isMember || !user) return undefined
    let active = true
    let socket

    const connect = async () => {
      try {
        const token = await getToken()
        if (!active) return
        socket = io(SOCKET_URL, {
          auth: {
            token,
            userName: user.fullName || 'SpeedHype member',
            userImage: user.imageUrl || '',
          },
          reconnection: true,
        })
        socketRef.current = socket
        socket.on('connect', () => {
          socket.emit('community:join-room', { communityId: community._id }, (result) => {
            if (!active) return
            if (result?.success) {
              setSocketStatus('connected')
            } else {
              setSocketStatus('disconnected')
              setError(result?.message || 'Could not join community chat.')
            }
          })
        })
        socket.on('community:message', (message) => {
          if (!active) return
          setMessages((existing) => (
            existing.some((item) => item._id === message._id) ? existing : [...existing, message]
          ))
        })
        socket.on('disconnect', () => {
          if (active) setSocketStatus('disconnected')
        })
        socket.on('connect_error', (connectionError) => {
          if (active) {
            setSocketStatus('disconnected')
            setError(connectionError.message || 'Chat connection failed.')
          }
        })
      } catch {
        if (active) {
          setSocketStatus('disconnected')
          setError('Could not authenticate with community chat. Refresh and try again.')
        }
      }
    }

    connect()
    return () => {
      active = false
      if (socket) {
        socket.emit('community:leave-room', { communityId: community._id })
        socket.disconnect()
      }
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [community?._id, community?.isMember, getToken, user])

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [messages])

  const toggleMembership = async () => {
    if (!community) return
    setMembershipPending(true)
    setError('')
    setNotice('')
    try {
      const response = await authenticatedRequest(
        getToken,
        'POST',
        `/communities/${communityId}/${community.isMember ? 'leave' : 'join'}`,
        { displayName: user?.fullName || 'SpeedHype member', imageUrl: user?.imageUrl || '' },
      )
      if (response.data.community.isMember) setSocketStatus('connecting')
      setCommunity(response.data.community)
      if (!response.data.community.isMember) setMessages([])
      setNotice(response.data.community.isMember ? 'You joined the community.' : 'You left the community.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Membership could not be updated.')
    } finally {
      setMembershipPending(false)
    }
  }

  const deleteCommunity = async () => {
    if (!window.confirm(`Delete ${community.name} and its chat history? This cannot be undone.`)) return
    setError('')
    try {
      await authenticatedRequest(getToken, 'DELETE', `/communities/${communityId}`)
      navigate('/communities', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Community could not be deleted.')
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const text = draft.trim()
    if ((!text && !mediaFile) || sending) return
    if (!socketRef.current?.connected || socketStatus !== 'connected') {
      setError('Chat is reconnecting. Please wait and try sending again.')
      return
    }
    setSending(true)
    setError('')
    try {
      let media
      if (mediaFile) {
        media = {
          filename: mediaFile.name,
          mimeType: mediaFile.type,
          buffer: new Uint8Array(await mediaFile.arrayBuffer()),
        }
      }
      socketRef.current.timeout(20000).emit(
        'community:message',
        { communityId, text, media },
        (timeoutError, result) => {
          setSending(false)
          if (timeoutError) {
            setError('Message timed out. Check your connection and try again.')
            return
          }
          if (!result?.success) {
            setError(result?.message || 'Message could not be sent.')
            return
          }
          setDraft('')
          setMediaFile(null)
          const input = document.getElementById('community-chat-media')
          if (input) input.value = ''
        },
      )
    } catch (sendError) {
      setSending(false)
      setError(sendError.message || 'Message could not be sent.')
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">Loading community…</div>
  }
  if (!community) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p role="alert" className="text-red-300">{error || 'Community not found.'}</p>
        <Link to="/communities" className="mt-5 inline-flex font-semibold text-red-400 hover:text-red-300">← Back to communities</Link>
      </div>
    )
  }

  const isCreator = user?.id === community.creatorId

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/communities" className="mb-5 inline-flex text-sm font-semibold text-zinc-400 hover:text-white">← All communities</Link>
      <section className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="relative h-48 bg-gradient-to-br from-zinc-800 to-red-950 sm:h-64">
          {community.coverImage?.url && <img src={community.coverImage.url} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-black/10 to-transparent" />
          <span className="absolute bottom-5 left-5 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">{community.category}</span>
        </div>
        <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="min-w-0">
            <h1 className="text-3xl font-black sm:text-4xl">{community.name}</h1>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap leading-7 text-zinc-400">{community.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              <span><strong className="text-zinc-200">{community.memberCount ?? community.members?.length ?? 0}</strong> members</span>
              <span>Created by <strong className="text-zinc-200">{community.creatorName}</strong></span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {isCreator && (
              <>
                <Link to={`/communities/${communityId}/edit`} className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">Edit</Link>
                <button onClick={deleteCommunity} className="rounded-xl border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-950">Delete</button>
              </>
            )}
            {!isCreator && (
              <button onClick={toggleMembership} disabled={membershipPending} className={`rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50 ${community.isMember ? 'border border-zinc-700 text-zinc-300 hover:border-red-900 hover:text-red-300' : 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:brightness-110'}`}>
                {membershipPending ? 'Please wait…' : community.isMember ? 'Leave community' : 'Join community'}
              </button>
            )}
          </div>
        </div>
      </section>

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Live community chat</p>
              <h2 className="mt-1 text-xl font-bold">Pit lane</h2>
            </div>
            <span className={`flex items-center gap-2 text-xs ${socketStatus === 'connected' ? 'text-emerald-300' : 'text-zinc-500'}`}>
              <span className={`h-2 w-2 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              {socketStatus === 'connected' ? 'Connected' : socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
            </span>
          </div>

          {!community.isMember ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-xl font-bold">Join the crew to enter the chat.</h3>
              <p className="mt-2 text-sm text-zinc-400">Members can share updates, photos, videos, and advice in real time.</p>
              <button onClick={toggleMembership} disabled={membershipPending} className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500 disabled:opacity-50">{membershipPending ? 'Please wait…' : 'Join community'}</button>
            </div>
          ) : (
            <>
              <div ref={messageListRef} className="flex h-[min(60vh,620px)] flex-col gap-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
                {messages.length === 0 ? (
                  <div className="m-auto max-w-sm text-center">
                    <p className="text-lg font-bold">The chat is quiet—for now.</p>
                    <p className="mt-2 text-sm text-zinc-500">Kick things off with a build update or a question for the crew.</p>
                  </div>
                ) : messages.map((message) => (
                  <article key={message._id} className={`flex gap-3 ${message.authorId === user?.id ? 'flex-row-reverse' : ''}`}>
                    {message.authorImage ? (
                      <img src={message.authorImage} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-red-300">{message.authorName?.charAt(0)?.toUpperCase() || 'S'}</span>
                    )}
                    <div className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${message.authorId === user?.id ? 'bg-red-950/60' : 'bg-zinc-800/80'}`}>
                      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-xs font-bold text-zinc-200">{message.authorName}</span>
                        <time className="text-[10px] text-zinc-500">{formatDate(message.createdAt)}</time>
                      </div>
                      {message.text && <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">{message.text}</p>}
                      {message.media?.resourceType === 'image' && <img src={message.media.url} alt="Community attachment" className="mt-2 max-h-72 rounded-lg object-contain" />}
                      {message.media?.resourceType === 'video' && <video src={message.media.url} controls preload="metadata" className="mt-2 max-h-72 max-w-full rounded-lg" />}
                    </div>
                  </article>
                ))}
              </div>
              <form onSubmit={sendMessage} className="border-t border-zinc-800 p-4 sm:p-5">
                {mediaFile && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                    <span className="truncate">{mediaFile.name}</span>
                    <button type="button" onClick={() => setMediaFile(null)} className="font-semibold text-red-300 hover:text-red-200">Remove</button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label htmlFor="community-chat-media" className="flex h-11 shrink-0 cursor-pointer items-center rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800" title="Attach image or video">
                    <span aria-hidden="true">＋</span><span className="sr-only">Attach image or video</span>
                  </label>
                  <input
                    id="community-chat-media"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (file.size > MEDIA_LIMIT) {
                        setError('Images and videos must be smaller than 12 MB.')
                        event.target.value = ''
                        return
                      }
                      setError('')
                      setMediaFile(file)
                    }}
                  />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Write a chat message</span>
                    <textarea
                      rows={1}
                      maxLength={2000}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Message the crew…"
                      className="max-h-32 min-h-11 w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-red-500"
                    />
                  </label>
                  <button disabled={sending || socketStatus !== 'connected' || (!draft.trim() && !mediaFile)} className="h-11 shrink-0 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {sending ? '…' : 'Send'}
                  </button>
                </div>
                <p className="mt-2 text-right text-[11px] text-zinc-600">Text, image, or video · media up to 12 MB</p>
              </form>
            </>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">The crew</p>
          <h2 className="mt-1 text-xl font-bold">{community.memberCount ?? community.members?.length ?? 0} members</h2>
          <div className="mt-5 space-y-3">
            {community.members?.map((member) => (
              <div key={member.userId} className="flex min-w-0 items-center gap-3">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-red-300">{member.displayName?.charAt(0)?.toUpperCase() || 'S'}</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{member.displayName}</p>
                  <p className="text-xs text-zinc-500">{member.userId === community.creatorId ? 'Creator' : 'Member'}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CommunityDetailsPage

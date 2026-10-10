import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const formatDate = (date) => new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(date))

const displayTag = (tag) => {
  const normalized = String(tag).trim().replace(/^#+/, '')
  return normalized ? `#${normalized}` : ''
}

const BlogDetailsPage = () => {
  const { blogId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [slideState, setSlideState] = useState({ blogId: null, index: 0 })

  useEffect(() => {
    let active = true
    const loadBlog = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedRequest(getToken, 'GET', `/blogs/${blogId}`)
        if (active) setBlog(response.data.blog)
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'This story could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadBlog()
    return () => { active = false }
  }, [blogId, getToken])

  const slideshowImages = blog
    ? [
      ...(blog.coverImage ? [{ ...blog.coverImage, role: 'Cover' }] : []),
      ...(blog.images || []).map((image, index) => ({ ...image, role: `Photo ${index + 1}` })),
    ]
    : []

  const slideIndex = slideState.blogId === blogId ? slideState.index : 0
  const updateSlide = (update) => {
    setSlideState((previous) => {
      const currentIndex = previous.blogId === blogId ? previous.index : 0
      const index = typeof update === 'function' ? update(currentIndex) : update
      return { blogId, index }
    })
  }

  useEffect(() => {
    if (slideshowImages.length < 2) return undefined
    const interval = window.setInterval(() => {
      setSlideState((previous) => {
        const currentIndex = previous.blogId === blogId ? previous.index : 0
        return { blogId, index: (currentIndex + 1) % slideshowImages.length }
      })
    }, 5000)
    return () => window.clearInterval(interval)
  }, [blogId, slideshowImages.length])

  const handleDelete = async () => {
    if (!window.confirm('Delete this story? This action cannot be undone.')) return
    setDeleting(true)
    setError('')
    try {
      await authenticatedRequest(getToken, 'DELETE', `/blogs/${blogId}`)
      navigate('/blogs', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The story could not be deleted.')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">Loading story…</div>
  }

  if (!blog) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p role="alert" className="text-red-300">{error || 'This story could not be found.'}</p>
        <Link to="/blogs" className="mt-5 inline-flex font-semibold text-red-400 hover:text-red-300">← Back to journal</Link>
      </div>
    )
  }

  const isAuthor = user?.id === blog.authorId

  return (
    <article className="mx-auto max-w-4xl">
      {slideshowImages.length > 0 && (
        <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900" aria-label="Blog photo slideshow">
          <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950 sm:aspect-[16/9]">
            <div
              className="flex h-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${slideIndex * 100}%)` }}
              aria-live="polite"
            >
              {slideshowImages.map((image, index) => (
                <div key={image.publicId} className="relative h-full w-full shrink-0">
                  <img
                    src={image.url}
                    alt={`${blog.title} — ${image.role}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-5 pb-5 pt-14 sm:px-7 sm:pb-7">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">{image.role}</p>
                    <p className="mt-1 line-clamp-1 text-lg font-bold text-white sm:text-xl">{blog.title}</p>
                  </div>
                  {index === 0 && blog.coverImage && (
                    <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
            {slideshowImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Show previous image"
                  onClick={() => updateSlide((index) => (
                    (index - 1 + slideshowImages.length) % slideshowImages.length
                  ))}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-2xl text-white backdrop-blur transition hover:bg-black/80 sm:left-5 sm:h-12 sm:w-12"
                >‹</button>
                <button
                  type="button"
                  aria-label="Show next image"
                  onClick={() => updateSlide((index) => (index + 1) % slideshowImages.length)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-2xl text-white backdrop-blur transition hover:bg-black/80 sm:right-5 sm:h-12 sm:w-12"
                >›</button>
                <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur sm:bottom-6 sm:right-7">
                  {slideIndex + 1} / {slideshowImages.length}
                </div>
              </>
            )}
          </div>
          {slideshowImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 py-3" aria-label="Choose slide">
              {slideshowImages.map((image, index) => (
                <button
                  key={image.publicId}
                  type="button"
                  aria-label={`Show ${image.role}`}
                  aria-current={slideIndex === index ? 'true' : undefined}
                  onClick={() => updateSlide(index)}
                  className={`h-1.5 rounded-full transition-all ${slideIndex === index ? 'w-8 bg-red-500' : 'w-3 bg-zinc-600 hover:bg-zinc-400'}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/blogs" className="text-sm font-semibold text-zinc-400 hover:text-white">← All stories</Link>
        {isAuthor && (
          <div className="flex gap-2">
            <Link to={`/blogs/${blog._id}/edit`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">Edit story</Link>
            <button onClick={handleDelete} disabled={deleting} className="rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}

      <header className="mb-8">
        <span className="inline-flex rounded-full border border-red-900/70 bg-red-950/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300">
          {blog.category}
        </span>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{blog.title}</h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            {blog.authorImage ? (
              <img src={blog.authorImage} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-950 font-bold text-red-300">
                {blog.authorName?.charAt(0)?.toUpperCase() || 'S'}
              </span>
            )}
            <div>
              <p className="font-semibold">{blog.authorName}</p>
              <p className="text-xs text-zinc-500">SpeedHype contributor</p>
            </div>
          </div>
          <span className="text-sm text-zinc-500">Published {formatDate(blog.createdAt)}</span>
          {blog.updatedAt !== blog.createdAt && new Date(blog.updatedAt) - new Date(blog.createdAt) > 60000 && (
            <span className="text-sm text-zinc-500">Updated {formatDate(blog.updatedAt)}</span>
          )}
        </div>
      </header>

      <div className="whitespace-pre-wrap break-words text-base leading-8 text-zinc-200 sm:text-lg sm:leading-9">{blog.content}</div>

      {blog.tags?.length > 0 && (
        <div className="mt-9 flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
          {blog.tags.filter((tag) => displayTag(tag)).map((tag, index) => (
            <span key={`${tag}-${index}`} className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-zinc-400">{displayTag(tag)}</span>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Keep the conversation moving</p>
        <h2 className="mt-2 text-2xl font-bold">Have a story of your own?</h2>
        <p className="mt-2 text-zinc-400">Share the build, the lesson, or the road that made you fall in love with cars.</p>
        <Link to="/blogs/new" className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">Write a story</Link>
      </div>
    </article>
  )
}

export default BlogDetailsPage

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const dateLabel = (date) => new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(date))

const categoryOptions = [
  'Automotive Culture',
  'Builds & Projects',
  'EV & Technology',
  'Guides',
  'Motorsport',
  'Off-road',
  'Performance',
  'Restoration',
  'Reviews',
]

const excerpt = (content) => {
  const text = content.replace(/\s+/g, ' ').trim()
  return text.length > 150 ? `${text.slice(0, 150).trim()}…` : text
}

const displayTag = (tag) => {
  const normalized = String(tag).trim().replace(/^#+/, '')
  return normalized ? `#${normalized}` : ''
}

function BlogCard({ blog }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-600">
      <Link to={`/blogs/${blog._id}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-red-950">
          {blog.coverImage?.url ? (
            <img
              src={blog.coverImage.url}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-end p-5">
              <span className="text-6xl font-black italic tracking-tighter text-white/10">SH</span>
            </div>
          )}
          <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
            {blog.category}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-snug text-white group-hover:text-red-300">
            {blog.title}
          </h3>
          <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-400">{excerpt(blog.content)}</p>
          <div className="mt-4 flex h-7 items-center gap-2 overflow-hidden">
            {blog.tags?.filter((tag) => displayTag(tag)).slice(0, 3).map((tag, index) => (
              <span key={`${tag}-${index}`} className="shrink-0 max-w-36 truncate rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {displayTag(tag)}
              </span>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              {blog.authorImage ? (
                <img src={blog.authorImage} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-950 font-bold text-red-300">
                  {blog.authorName?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-200">{blog.authorName}</p>
                <p className="text-xs text-zinc-500">{dateLabel(blog.createdAt)}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-red-400">Read story <span aria-hidden="true">↗</span></span>
          </div>
        </div>
      </Link>
    </article>
  )
}

const BlogsPage = () => {
  const { getToken } = useAuth()
  const [blogs, setBlogs] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const response = await authenticatedRequest(getToken, 'GET', '/blogs', null, {
          params: { search, category, sort },
        })
        if (active) setBlogs(response.data.blogs)
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || 'We could not load the stories right now.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }, search ? 250 : 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [category, getToken, retryKey, search, sort])

  const categories = useMemo(() => (
    [...new Set([...categoryOptions, ...blogs.map((blog) => blog.category).filter(Boolean)])]
      .sort((a, b) => a.localeCompare(b))
  ), [blogs])
  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative mb-9 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-9 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-12 -top-28 h-80 w-80 rounded-full bg-red-600/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-red-400">The SpeedHype journal</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Stories built for the <span className="text-red-500">drive.</span></h1>
            <p className="mt-4 max-w-xl leading-7 text-zinc-400">
              Real builds, sharp opinions, and deep dives from people who live and breathe cars.
            </p>
          </div>
          <Link
            to="/blogs/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-950/40 transition hover:brightness-110"
          >
            <span className="text-xl leading-none">+</span> Write a story
          </Link>
        </div>
      </section>

      <section className="mb-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_170px]">
        <label className="relative">
          <span className="sr-only">Search stories</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stories, tags, or authors"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-11 pr-4 text-white outline-none placeholder:text-zinc-500 focus:border-red-500"
          />
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-500"
          >
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort stories</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-500"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </section>

      {error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">
          <span>{error}</span>
          <button onClick={() => setRetryKey((value) => value + 1)} className="font-semibold underline">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading stories">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 px-6 py-16 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-400">No stories found</p>
          <h2 className="mt-3 text-2xl font-bold">Your next read is waiting to be written.</h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-400">Try another search, or be the first to share something with the SpeedHype community.</p>
          <Link to="/blogs/new" className="mt-6 inline-flex rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">Create a story</Link>
        </div>
      ) : (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">From the community</p>
              <h2 className="mt-1 text-2xl font-bold">Latest stories</h2>
            </div>
            <p className="text-sm text-zinc-500">{blogs.length} {blogs.length === 1 ? 'story' : 'stories'}</p>
          </div>
          <div className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3">
            {blogs.map((blog) => <BlogCard key={blog._id} blog={blog} />)}
          </div>
        </section>
      )}
    </div>
  )
}

export default BlogsPage

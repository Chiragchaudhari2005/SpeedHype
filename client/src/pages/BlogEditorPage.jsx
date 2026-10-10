import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const categories = [
  'Performance',
  'Builds & Projects',
  'Reviews',
  'Motorsport',
  'EV & Technology',
  'Restoration',
  'Off-road',
  'Guides',
  'Automotive Culture',
]

const getErrorMessage = (error) => (
  error.response?.data?.message || error.message || 'Something went wrong. Please try again.'
)

const parseTagInput = (value) => [...new Set(
  value
    .split(/,\s*|\s+(?=#)/)
    .map((tag) => tag.trim().replace(/^#+/, '').trim())
    .filter(Boolean),
)]

const BlogEditorPage = () => {
  const { blogId } = useParams()
  const editing = Boolean(blogId)
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [tags, setTags] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [currentCover, setCurrentCover] = useState(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [gallery, setGallery] = useState([])
  const galleryPreviewUrls = useRef(new Set())
  const draggedGalleryIndex = useRef(null)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing || !isLoaded) return undefined
    let active = true
    const loadBlog = async () => {
      setLoading(true)
      try {
        const response = await authenticatedRequest(getToken, 'GET', `/blogs/${blogId}`)
        const blog = response.data.blog
        if (!active) return
        if (blog.authorId !== user?.id) {
          setError('You can only edit your own stories.')
          return
        }
        setTitle(blog.title)
        setContent(blog.content)
        setCategory(blog.category)
        setTags((blog.tags || []).join(', '))
        setCurrentCover(blog.coverImage || null)
        setGallery((blog.images || []).map((image) => ({
          ...image,
          key: image.publicId,
          type: 'existing',
        })))
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError))
      } finally {
        if (active) setLoading(false)
      }
    }
    loadBlog()
    return () => { active = false }
  }, [blogId, editing, getToken, isLoaded, user?.id])

  useEffect(() => () => {
    galleryPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    galleryPreviewUrls.current.clear()
  }, [])

  const categoryOptions = useMemo(() => (
    category && !categories.includes(category) ? [category, ...categories] : categories
  ), [category])

  const handleGallerySelection = (event) => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (gallery.length + selected.length > 5) {
      setError('You can add up to five gallery images.')
      return
    }
    setError('')
    setGallery((existing) => [
      ...existing,
      ...selected.map((file) => {
        const preview = URL.createObjectURL(file)
        galleryPreviewUrls.current.add(preview)
        return {
          type: 'upload',
          key: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          file,
          preview,
        }
      }),
    ])
  }

  const moveGalleryImage = (fromIndex, toIndex) => {
    setGallery((images) => {
      if (toIndex < 0 || toIndex >= images.length) return images
      const reordered = [...images]
      const [image] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, image)
      return reordered
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (tags.length > 500) {
      setError('Tags must be 500 characters or fewer.')
      return
    }
    const parsedTags = parseTagInput(tags)
    if (parsedTags.length > 10 || parsedTags.some((tag) => tag.length > 500)) {
      setError('Use no more than ten tags, with each tag 500 characters or fewer.')
      return
    }
    if (gallery.length > 5) {
      setError('You can add up to five gallery images.')
      return
    }
    setSaving(true)
    const formData = new FormData()
    formData.append('title', title.trim())
    formData.append('content', content.trim())
    formData.append('category', category)
    formData.append('tags', JSON.stringify(parsedTags))
    if (user?.fullName) formData.append('authorName', user.fullName)
    if (user?.imageUrl) formData.append('authorImage', user.imageUrl)
    if (coverFile) formData.append('coverImage', coverFile)
    if (editing) {
      let uploadIndex = 0
      const galleryOrder = gallery.map((image) => {
        if (image.type === 'existing') {
          return { type: 'existing', url: image.url }
        }
        const index = uploadIndex++
        formData.append('galleryImages', image.file)
        return { type: 'upload', index }
      })
      formData.append('galleryOrder', JSON.stringify(galleryOrder))
      formData.append('removeCoverImage', String(removeCover))
    } else {
      gallery.forEach((image) => formData.append('galleryImages', image.file))
    }

    try {
      const response = await authenticatedRequest(
        getToken,
        editing ? 'PUT' : 'POST',
        editing ? `/blogs/${blogId}` : '/blogs',
        formData,
        { headers: { 'Content-Type': undefined } },
      )
      navigate(`/blogs/${response.data.blog._id}`)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return <div className="mx-auto max-w-3xl animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">Loading editor…</div>
  }

  if (editing && error && !title) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p role="alert" className="text-red-300">{error}</p>
        <Link to="/blogs" className="mt-5 inline-flex font-semibold text-red-400 hover:text-red-300">← Back to journal</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={editing ? `/blogs/${blogId}` : '/blogs'} className="text-sm font-semibold text-zinc-400 hover:text-white">
        ← {editing ? 'Back to story' : 'Back to journal'}
      </Link>
      <div className="mb-7 mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-400">{editing ? 'Refine your story' : 'Add to the journal'}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{editing ? 'Edit story' : 'Write a story'}</h1>
        <p className="mt-2 text-zinc-400">Good stories start with what you’ve learned behind the wheel.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p>}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Story title</span>
          <input
            required
            maxLength={140}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your story a memorable headline"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500"
          />
          <span className="mt-1 block text-right text-xs text-zinc-600">{title.length}/140</span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Category</span>
          <select
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
          >
            {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Your story</span>
          <textarea
            required
            maxLength={30000}
            rows={14}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share the details, lessons, and moments that made this worth telling…"
            className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 leading-7 text-white outline-none placeholder:text-zinc-600 focus:border-red-500"
          />
          <span className="mt-1 block text-right text-xs text-zinc-600">{content.length.toLocaleString()}/30,000</span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Tags <span className="font-normal text-zinc-500">· comma separated, up to 10</span></span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            maxLength={500}
            placeholder="trackday, project-car, tips"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500"
          />
          <span className="mt-1 block text-right text-xs text-zinc-600">{tags.length}/500</span>
        </label>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="cover-image" className="mb-2 block text-sm font-semibold">Cover image <span className="font-normal text-zinc-500">· optional</span></label>
            {currentCover && !removeCover && !coverFile && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <img src={currentCover.url} alt="" className="h-14 w-20 rounded object-cover" />
                <button type="button" onClick={() => setRemoveCover(true)} className="text-xs font-semibold text-red-300 hover:text-red-200">Remove</button>
              </div>
            )}
            {coverFile && <p className="mb-2 truncate text-xs text-zinc-400">Selected: {coverFile.name}</p>}
            <input id="cover-image" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={(event) => {
              setCoverFile(event.target.files?.[0] || null)
              setRemoveCover(false)
            }} className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-zinc-700" />
            <p className="mt-2 text-xs text-zinc-500">JPG, PNG, WebP, AVIF or GIF · max 8 MB</p>
          </div>
          <div>
            <label htmlFor="gallery-images" className="mb-2 block text-sm font-semibold">Gallery images <span className="font-normal text-zinc-500">· up to 5</span></label>
            <input id="gallery-images" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple onChange={handleGallerySelection} className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-zinc-700" />
            <p className="mt-2 text-xs text-zinc-500">Drag photos to arrange, or use the arrow buttons.</p>
            <div className="mt-3 space-y-2">
              {gallery.map((image, index) => (
                <div
                  key={image.key}
                  draggable
                  onDragStart={() => { draggedGalleryIndex.current = index }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (draggedGalleryIndex.current !== null) {
                      moveGalleryImage(draggedGalleryIndex.current, index)
                    }
                    draggedGalleryIndex.current = null
                  }}
                  onDragEnd={() => { draggedGalleryIndex.current = null }}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2"
                >
                  <img
                    src={image.type === 'existing' ? image.url : image.preview}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                    {image.type === 'existing' ? 'Saved image' : image.file.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Move image ${index + 1} left`}
                    disabled={index === 0}
                    onClick={() => moveGalleryImage(index, index - 1)}
                    className="rounded px-1.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                  >←</button>
                  <button
                    type="button"
                    aria-label={`Move image ${index + 1} right`}
                    disabled={index === gallery.length - 1}
                    onClick={() => moveGalleryImage(index, index + 1)}
                    className="rounded px-1.5 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                  >→</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (image.preview) {
                        URL.revokeObjectURL(image.preview)
                        galleryPreviewUrls.current.delete(image.preview)
                      }
                      setGallery((items) => items.filter((item) => item.key !== image.key))
                    }}
                    className="shrink-0 px-1 text-xs font-semibold text-red-300 hover:text-red-200"
                  >Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse justify-end gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
          <Link to={editing ? `/blogs/${blogId}` : '/blogs'} className="rounded-xl border border-zinc-700 px-5 py-3 text-center font-semibold text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Link>
          <button disabled={saving || !user} type="submit" className="rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish story'}
          </button>
        </div>
        {!user && <p role="alert" className="text-sm text-red-300">Your profile is still loading. Please refresh and try again.</p>}
      </form>
    </div>
  )
}

export default BlogEditorPage

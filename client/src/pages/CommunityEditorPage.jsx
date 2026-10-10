import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const categories = ['Cars', 'Bikes', 'EVs', 'Modifications', 'Racing', 'Restoration', 'Off-road', 'General']
const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Something went wrong.'

const CommunityEditorPage = () => {
  const { communityId } = useParams()
  const editing = Boolean(communityId)
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [coverFile, setCoverFile] = useState(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing || !isLoaded) return undefined
    let active = true
    const loadCommunity = async () => {
      setLoading(true)
      try {
        const response = await authenticatedRequest(getToken, 'GET', `/communities/${communityId}`)
        const community = response.data.community
        if (!active) return
        if (community.creatorId !== user?.id) {
          setError('Only the community creator can edit it.')
          return
        }
        setName(community.name)
        setDescription(community.description)
        setCategory(community.category)
        setCoverUrl(community.coverImage?.url || '')
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError))
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCommunity()
    return () => { active = false }
  }, [communityId, editing, getToken, isLoaded, user?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('description', description.trim())
    formData.append('category', category)
    if (!editing) {
      formData.append('creatorName', user?.fullName || 'SpeedHype member')
      formData.append('creatorImage', user?.imageUrl || '')
    }
    if (coverFile) formData.append('coverImage', coverFile)

    try {
      const response = await authenticatedRequest(
        getToken,
        editing ? 'PUT' : 'POST',
        editing ? `/communities/${communityId}` : '/communities',
        formData,
        { headers: { 'Content-Type': undefined } },
      )
      navigate(`/communities/${response.data.community._id}`, { replace: true })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || loading) {
    return <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">Loading community…</div>
  }
  if (editing && error && !name) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p role="alert" className="text-red-300">{error}</p>
        <Link to="/communities" className="mt-5 inline-flex font-semibold text-red-400 hover:text-red-300">← Back to communities</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={editing ? `/communities/${communityId}` : '/communities'} className="text-sm font-semibold text-zinc-400 hover:text-white">← {editing ? 'Back to community' : 'All communities'}</Link>
      <div className="mb-7 mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-400">{editing ? 'Community settings' : 'Bring your people together'}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{editing ? 'Edit community' : 'Create a community'}</h1>
        <p className="mt-2 text-zinc-400">Make a home for the people who share your automotive passion.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p>}
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Community name</span>
          <input required minLength={3} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Classic JDM Garage" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          <span className="mt-1 block text-right text-xs text-zinc-600">{name.length}/60</span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Description</span>
          <textarea required minLength={10} maxLength={1200} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What brings this crew together? What can members share here?" className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          <span className="mt-1 block text-right text-xs text-zinc-600">{description.length}/1,200</span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Category</span>
          <select required value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500">
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div>
          <label htmlFor="community-cover" className="mb-2 block text-sm font-semibold">Cover image <span className="font-normal text-zinc-500">· optional</span></label>
          {coverFile && <p className="mb-2 truncate text-xs text-zinc-400">Selected: {coverFile.name}</p>}
          {!coverFile && coverUrl && <img src={coverUrl} alt="" className="mb-3 aspect-[16/6] w-full rounded-xl object-cover" />}
          <input id="community-cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-zinc-700" />
          <p className="mt-2 text-xs text-zinc-500">JPG, PNG, WebP, or AVIF · max 8 MB</p>
        </div>
        <div className="flex flex-col-reverse justify-end gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
          <Link to={editing ? `/communities/${communityId}` : '/communities'} className="rounded-xl border border-zinc-700 px-5 py-3 text-center font-semibold text-zinc-300 hover:bg-zinc-800">Cancel</Link>
          <button disabled={saving} type="submit" className="rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-60">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create community'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CommunityEditorPage

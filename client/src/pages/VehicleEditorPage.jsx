import { useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link, useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const categories = ['Sports car', 'Muscle car', 'Supercar', 'Electric', 'SUV', 'Sedan', 'Coupe', 'Motorcycle', 'Other']

const VehicleEditorPage = () => {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [category, setCategory] = useState(categories[0])
  const [summary, setSummary] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [launchDate, setLaunchDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await authenticatedRequest(getToken, 'POST', '/cars', {
        make,
        model,
        year: Number(year),
        category,
        summary,
        imageUrl,
        launchDate,
      })
      navigate('/feed', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The vehicle launch could not be added.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/cars" className="text-sm font-semibold text-zinc-400 hover:text-white">← Back to cars</Link>
      <div className="mb-7 mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Fresh off the line</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Add a car launch</h1>
        <p className="mt-2 text-zinc-400">Add a vehicle to the SpeedHype database and share it with the community feed.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-8">
        {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Make</span>
            <input required maxLength={60} value={make} onChange={(event) => setMake(event.target.value)} placeholder="e.g. Porsche" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Model</span>
            <input required maxLength={80} value={model} onChange={(event) => setModel(event.target.value)} placeholder="e.g. 911 GT3" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Model year</span>
            <input required type="number" min="1886" max="2200" value={year} onChange={(event) => setYear(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500">
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Launch date</span>
          <input required type="date" value={launchDate} onChange={(event) => setLaunchDate(event.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Image URL <span className="font-normal text-zinc-500">· optional</span></span>
          <input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Launch notes <span className="font-normal text-zinc-500">· optional</span></span>
          <textarea maxLength={400} rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="What makes this launch worth knowing about?" className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          <span className="mt-1 block text-right text-xs text-zinc-600">{summary.length}/400</span>
        </label>
        <div className="flex flex-col-reverse justify-end gap-3 border-t border-zinc-800 pt-5 sm:flex-row">
          <Link to="/cars" className="rounded-xl border border-zinc-700 px-5 py-3 text-center font-semibold text-zinc-300 hover:bg-zinc-800">Cancel</Link>
          <button disabled={saving} type="submit" className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-60">{saving ? 'Adding…' : 'Add car launch'}</button>
        </div>
      </form>
    </div>
  )
}

export default VehicleEditorPage

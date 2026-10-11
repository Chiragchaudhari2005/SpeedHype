import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import ManualCarModal from '../components/ManualCarModal'

const categories = ['hatchback', 'sedan', 'suv', 'truck', 'coupe', 'convertible', 'electric', 'hybrid']
const severityStyle = {
  error: 'border-red-800 bg-red-950/60 text-red-200',
  warn: 'border-amber-800 bg-amber-950/50 text-amber-200',
  info: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
}
const runStyle = {
  running: 'bg-sky-950 text-sky-300 border-sky-800',
  completed: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  completed_with_errors: 'bg-amber-950 text-amber-300 border-amber-800',
  quota_exhausted: 'bg-orange-950 text-orange-300 border-orange-800',
  failed: 'bg-red-950 text-red-300 border-red-800',
}
const fieldLabels = {
  priceAmount: 'Ex-showroom price', engine: 'Engine', horsepower: 'Power', torque: 'Torque', mileage: 'Mileage / range',
  fuelType: 'Fuel', transmission: 'Transmission', seatingCapacity: 'Seats', variant: 'Variant', category: 'Category',
}
const statusText = {
  cross_checked: 'cross-checked by 2+ domains', single_source: 'single source', conflict: 'conflict', missing: 'missing',
  derived_from_fuel_type: 'derived',
}

const money = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
const editableFields = [
  { key: 'variant', label: 'Variant', type: 'text' },
  { key: 'launchYear', label: 'Model year', type: 'number' },
  { key: 'priceAmount', label: 'Ex-showroom price (INR)', type: 'number' },
  { key: 'engine', label: 'Engine', type: 'text' },
  { key: 'horsepower', label: 'Power', type: 'number' },
  { key: 'horsepowerUnit', label: 'Power unit', type: 'text' },
  { key: 'torque', label: 'Torque', type: 'number' },
  { key: 'torqueUnit', label: 'Torque unit', type: 'text' },
  { key: 'mileage', label: 'Mileage / range', type: 'number' },
  { key: 'mileageUnit', label: 'Mileage unit', type: 'text' },
  { key: 'fuelType', label: 'Fuel', type: 'text' },
  { key: 'transmission', label: 'Transmission', type: 'text' },
  { key: 'seatingCapacity', label: 'Seats', type: 'number' },
]
const display = (car, key) => {
  const value = car[key]
  if (value == null || value === '') return null
  if (key === 'priceAmount') return money(value)
  const unit = car[`${key}Unit`]
  return unit ? `${value} ${unit}` : String(value)
}

function ReviewCard({ car, onDone, onEdit, getToken }) {
  const [category, setCategory] = useState(car.category || '')
  const [notes, setNotes] = useState('')
  const [override, setOverride] = useState('')
  const [approveImages, setApproveImages] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const issues = car.validation?.issues || []
  const needsAttention = car.validation?.recommendation === 'needs_attention'

  const startEdit = () => {
    setForm(Object.fromEntries(editableFields.map(({ key }) => [key, car[key] ?? ''])))
    setEditing(true)
    setMessage('')
  }

  const saveEdit = async () => {
    setBusy(true)
    setMessage('')
    try {
      // Only changed fields are sent; an emptied input becomes null (unknown stays unknown, never guessed).
      const changed = editableFields.filter(({ key }) => String(form[key] ?? '') !== String(car[key] ?? ''))
      if (!changed.length) { setEditing(false); return }
      const body = Object.fromEntries(changed.map(({ key }) => [key, form[key] === '' ? null : form[key]]))
      await authenticatedRequest(getToken, 'PATCH', `/car-catalog/review/${car._id}`, body)
      setEditing(false)
      onDone()
    } catch (error) {
      setMessage(error.response?.data?.message || 'The edit could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const act = async (action) => {
    setBusy(true)
    setMessage('')
    try {
      const body = action === 'approve'
        ? { category, notes, overrideReason: override, approveImages }
        : action === 'retry' ? {} : { notes }
      const response = await authenticatedRequest(getToken, 'POST', `/car-catalog/review/${car._id}/${action}`, body)
      if (action === 'retry') setMessage(response.data.message || 'Retry started.')
      onDone()
    } catch (error) {
      setMessage(error.response?.data?.message || 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black">{car.brand} {car.model} <span className="text-zinc-400">{car.launchYear}</span></h3>
          <p className="text-sm text-zinc-400">{car.variant || 'Variant not stated by sources'}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${needsAttention ? severityStyle.warn : 'border-emerald-800 bg-emerald-950/50 text-emerald-300'}`}>
          {needsAttention ? 'Needs attention' : 'Ready for review'}
        </span>
      </header>

      {editing ? (
        <div className="mt-4 rounded-xl border border-sky-900 bg-sky-950/20 p-4">
          <p className="text-sm font-bold text-sky-200">Editing specifications — leave a field empty to keep it unknown (null)</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {editableFields.map(({ key, label, type }) => (
              <label key={key} className="text-xs font-semibold text-zinc-400">
                {label}
                <input type={type} step="any" value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-3">
            <button type="button" disabled={busy} onClick={saveEdit} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50">Save changes</button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">Cancel</button>
          </div>
        </div>
      ) : (
      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(fieldLabels).map(([key, label]) => {
          const value = display(car, key)
          const status = car.validation?.fieldStatus?.[key === 'priceAmount' ? 'price' : key === 'fuelType' ? 'fuel_type' : key === 'seatingCapacity' ? 'seating_capacity' : key]
          const source = car.fieldSources?.[key]
          return (
            <div key={key} className="rounded-xl bg-zinc-800/70 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
              <dd className={`mt-1 font-semibold ${value ? '' : 'text-zinc-500'}`}>{value ?? 'null (not found)'}</dd>
              {car.editedFields?.includes(key) && <dd className="mt-1 text-xs text-sky-300">edited by admin</dd>}
              {status && <dd className="mt-1 text-xs text-zinc-400">{statusText[status] || status}</dd>}
              {source && (
                <details className="mt-1 text-xs text-zinc-400">
                  <summary className="cursor-pointer text-zinc-300">evidence</summary>
                  <p className="mt-1">“{source.quote}”</p>
                  <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-red-300 underline">{source.sourceName}</a>
                </details>
              )}
            </div>
          )
        })}
      </dl>
      )}

      {car.validation?.conflicts?.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm">
          <p className="font-bold text-red-200">Conflicting source values (left null)</p>
          {car.validation.conflicts.map((conflict) => (
            <p key={conflict.field} className="mt-1 text-red-100/80">
              <strong>{conflict.field}:</strong> {conflict.values.map((v) => `${v.value}${v.unit ? ` ${v.unit}` : ''}`).join(' vs ')}
            </p>
          ))}
        </div>
      )}

      {issues.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className={`rounded-lg border px-3 py-1.5 text-sm ${severityStyle[issue.severity]}`}>
              <strong className="uppercase">{issue.severity}</strong> · {issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 text-sm">
        <p className="font-semibold text-zinc-300">Sources ({car.sources?.length || 0})</p>
        <ul className="mt-1 space-y-1">
          {(car.sources || []).map((source) => (
            <li key={source.url}><span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs uppercase">{source.tier}</span>
              <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-red-300 underline">{source.title || source.url}</a></li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">Last checked {car.sourceVerifiedAt ? new Date(car.sourceVerifiedAt).toLocaleString() : 'n/a'} · run {car.ingestionRunId}</p>
      </div>

      {car.images?.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-zinc-300">Image links (not downloaded)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {car.images.map((image) => (
              <figure key={image.url} className="rounded-lg bg-zinc-800/60 p-2 text-xs text-zinc-400">
                <img src={image.url} alt={image.alt} loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full rounded object-cover" />
                <figcaption className="mt-1">{image.attribution}<br />{image.license}</figcaption>
              </figure>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={approveImages} onChange={(e) => setApproveImages(e.target.checked)} />
            I confirm these image links may be displayed (otherwise they are removed on approval)
          </label>
        </div>
      )}

      <div className="mt-5 grid gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-zinc-300">Body category {car.category ? '' : '(required)'}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2">
            <option value="">Select…</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-zinc-300">Reviewer notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2" />
        </label>
        {needsAttention && (
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-amber-300">Why is it acceptable to approve despite the warnings? (required)</span>
            <input value={override} onChange={(e) => setOverride(e.target.value)} maxLength={1000} className="w-full rounded-xl border border-amber-800 bg-zinc-950 px-3 py-2" />
          </label>
        )}
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-red-300">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {car.reviewStatus === 'pending' && (
          <button type="button" disabled={busy || editing} onClick={() => act('approve')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">Approve &amp; publish</button>
        )}
        {car.reviewStatus !== 'rejected' && (
          <button type="button" disabled={busy} onClick={() => act('reject')} className="rounded-xl border border-red-800 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-950 disabled:opacity-50">Reject (reason in notes)</button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onEdit(car)}
          className="rounded-xl border border-sky-700 bg-sky-950/60 px-4 py-2 text-sm font-bold text-sky-200 hover:bg-sky-900 disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>✏️</span> Edit Car Data
        </button>
        <button
          type="button"
          disabled={busy || editing}
          onClick={startEdit}
          className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          Quick inline edit
        </button>
        {car.reviewStatus === 'pending' && (
          <button type="button" disabled={busy} onClick={() => act('retry')} className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50">Retry extraction</button>
        )}
      </div>
    </article>
  )
}

const AdminCarsPage = () => {
  const { getToken } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)
  const [agent, setAgent] = useState(null)
  const [runs, setRuns] = useState([])
  const [openRun, setOpenRun] = useState(null)
  const [runDetail, setRunDetail] = useState(null)
  const [pending, setPending] = useState([])
  const [counts, setCounts] = useState(null)
  const [count, setCount] = useState(5)
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState('')
  const [showManualModal, setShowManualModal] = useState(false)
  const [editingCar, setEditingCar] = useState(null)
  const [reviewStatusTab, setReviewStatusTab] = useState('pending')
  const [canUploadImage, setCanUploadImage] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [status, runList, review, countResponse] = await Promise.all([
        authenticatedRequest(getToken, 'GET', '/car-catalog/ingestion/status'),
        authenticatedRequest(getToken, 'GET', '/car-catalog/ingestion/runs'),
        authenticatedRequest(getToken, 'GET', `/car-catalog/review?status=${reviewStatusTab}`),
        authenticatedRequest(getToken, 'GET', '/car-catalog/review/counts'),
      ])
      setAgent(status.data)
      setRuns(runList.data.runs)
      setPending(review.data.cars)
      setCounts(countResponse.data.counts)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Admin data could not be loaded.')
    }
  }, [getToken, reviewStatusTab])

  const handleManualCarCreated = (newCar, published) => {
    setMessage(
      published
        ? `Successfully created and published ${newCar.brand} ${newCar.model} to the public catalogue!`
        : `Successfully saved ${newCar.brand} ${newCar.model} as pending review.`
    )
    refresh()
  }

  const handleManualCarUpdated = (updatedCar) => {
    setMessage(`Successfully updated ${updatedCar.brand} ${updatedCar.model} (${updatedCar.reviewStatus}).`)
    setEditingCar(null)
    setShowManualModal(false)
    refresh()
  }

  useEffect(() => {
    authenticatedRequest(getToken, 'GET', '/car-catalog/permissions')
      .then((response) => {
        setIsAdmin(response.data.isAdmin)
        setCanUploadImage(Boolean(response.data.canUploadImage))
      })
      .catch(() => setIsAdmin(false))
  }, [getToken])

  const running = agent?.running || runs.some((run) => run.status === 'running')
  useEffect(() => {
    if (!isAdmin) return undefined
    const initialTimer = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, running ? 3000 : 15000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [isAdmin, refresh, running])

  useEffect(() => {
    if (!openRun) return undefined
    let active = true
    const load = () => authenticatedRequest(getToken, 'GET', `/car-catalog/ingestion/runs/${openRun}`)
      .then((response) => { if (active) setRunDetail(response.data.run) })
      .catch(() => {})
    load()
    const timer = window.setInterval(load, 3000)
    return () => { active = false; window.clearInterval(timer) }
  }, [openRun, getToken])

  const start = async () => {
    setStarting(true)
    setMessage('')
    try {
      const response = await authenticatedRequest(getToken, 'POST', '/car-catalog/ingestion/trigger', { count: Number(count) })
      setMessage(response.data.message)
      setOpenRun(response.data.runId)
      refresh()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Ingestion could not be started.')
    } finally {
      setStarting(false)
    }
  }

  const usage = agent?.usage
  const limits = agent?.limits
  const sortedPending = useMemo(() => [...pending].sort((a, b) => (a.validation?.recommendation === 'needs_attention') - (b.validation?.recommendation === 'needs_attention')), [pending])

  if (isAdmin === null) return <div className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-10" />
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl rounded-2xl border border-red-900 bg-red-950/40 p-8 text-center">
        <h1 className="text-2xl font-black">Administrator access required</h1>
        <p className="mt-2 text-zinc-300">Your account is not on the catalog administrator list.</p>
        <Link to="/cars" className="mt-4 inline-block font-bold text-red-300 underline">Back to cars</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-400">Administrator console</p>
        <h1 className="mt-2 text-4xl font-black">Car data ingestion &amp; review</h1>
        <p className="mt-2 max-w-3xl text-zinc-400">Records are collected from official and trusted sources, checked automatically, and saved as <strong>pending</strong>. Nothing reaches the public Cars page until you approve it.</p>
      </header>

      <section aria-label="Catalogue counts" className="grid gap-3 sm:grid-cols-3">
        {[
          ['pending', 'Pending review', counts?.pending, 'text-amber-300'],
          ['approved', 'Published (approved)', counts?.published, 'text-emerald-300'],
          ['rejected', 'Rejected', counts?.rejected, 'text-red-300'],
        ].map(([statusKey, label, value, tone]) => (
          <button
            key={statusKey}
            type="button"
            onClick={() => setReviewStatusTab(statusKey)}
            className={`rounded-2xl border p-4 text-left transition ${
              reviewStatusTab === statusKey
                ? 'border-zinc-500 bg-zinc-800/80 shadow-md ring-1 ring-zinc-500'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
            <p className={`mt-1 text-3xl font-black ${tone}`}>{value ?? '—'}</p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Run ingestion</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Agent: {!agent ? 'checking…' : agent.reachable === false ? 'unreachable - start the Python service' : agent.configured ? (agent.running ? 'running' : 'ready') : `not ready${agent.missingConfig?.length ? ` (missing ${agent.missingConfig.join(', ')})` : ''}`}
            </p>
            {agent?.ollama && (
              <p className={`mt-1 text-xs ${agent.ollama.model ? 'text-emerald-400' : 'text-amber-300'}`}>
                Local LLM: {agent.ollama.model ? `Ollama · ${agent.ollama.model}` : agent.ollama.error}
              </p>
            )}
            {usage && limits && (
              <p className="mt-1 text-xs text-zinc-500">Web search usage today · Tavily {usage.tavilyToday}/{limits.tavilyPerDay} (month {usage.tavilyMonth}/{limits.tavilyPerMonth}) · local LLM calls today {usage.llmToday}</p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-zinc-300">Cars (1–{limits?.maxCarsPerRun || 25})</span>
              <input type="number" min="1" max={limits?.maxCarsPerRun || 25} value={count} onChange={(e) => setCount(e.target.value)} className="w-24 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2" />
            </label>
            <button type="button" onClick={start} disabled={starting || running || !agent?.configured} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">
              {starting ? 'Starting…' : running ? 'Run in progress' : 'Start ingestion'}
            </button>
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="rounded-xl border border-emerald-700/80 bg-emerald-950/70 px-5 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-900/90 hover:text-white flex items-center gap-1.5 shadow-sm"
            >
              <span className="text-base font-black leading-none">+</span> Add Car Manually
            </button>
          </div>
        </div>
        {message && <p role="status" className="mt-3 text-sm text-zinc-300">{message}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Recent runs</h2>
        {runs.length === 0 ? <p className="text-sm text-zinc-500">No runs yet.</p> : (
          <div className="space-y-2">
            {runs.map((run) => (
              <div key={run._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <button type="button" onClick={() => { setRunDetail(null); setOpenRun(openRun === run._id ? null : run._id) }} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                  <span className="text-sm">{new Date(run.startedAt).toLocaleString()} · requested {run.requestedCount}</span>
                  <span className="flex items-center gap-3 text-xs text-zinc-400">
                    <span>pending {run.counts?.pendingReview || 0} · attention {run.counts?.needsAttention || 0} · skipped {run.counts?.skippedExisting || 0} · failed {run.counts?.failed || 0}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 font-bold uppercase ${runStyle[run.status] || ''}`}>{run.status.replaceAll('_', ' ')}</span>
                  </span>
                </button>
                {openRun === run._id && runDetail && (
                  <div className="mt-4 space-y-4 border-t border-zinc-800 pt-4 text-sm">
                    <p className="text-xs text-zinc-500">API calls: Tavily {runDetail.usage?.tavilySearches ?? 0} · local LLM {runDetail.usage?.llmCalls ?? 0}</p>
                    {runDetail.results?.map((result) => (
                      <div key={result.identityKey || `${result.target.brand}-${result.target.model}`} className="rounded-lg bg-zinc-800/50 p-3">
                        <p className="font-semibold">{result.target.brand} {result.target.model} {result.target.year} → {result.status.replaceAll('_', ' ')}{result.recommendation ? ` (${result.recommendation.replaceAll('_', ' ')})` : ''}</p>
                        <p className="mt-1 text-xs text-zinc-400">Sources: {result.sources?.length ? result.sources.map((s) => `${s.domain} [${s.tier}]`).join(', ') : 'none'}</p>
                        {result.issues?.slice(0, 6).map((issue, index) => <p key={index} className="mt-0.5 text-xs text-zinc-400">{issue.severity}: {issue.message}</p>)}
                      </div>
                    ))}
                    {runDetail.errors?.length > 0 && (
                      <div className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-red-200">
                        <p className="font-bold">Errors</p>
                        {runDetail.errors.map((err, index) => <p key={index} className="mt-1 text-xs">{err}</p>)}
                      </div>
                    )}
                    <details>
                      <summary className="cursor-pointer font-semibold text-zinc-300">Run log ({runDetail.logs?.length || 0})</summary>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-zinc-300">{(runDetail.logs || []).map((l) => `${new Date(l.ts).toLocaleTimeString()} [${l.level}] ${l.message}`).join('\n')}</pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'pending', label: 'Pending review', count: counts?.pending },
              { id: 'approved', label: 'Published (live)', count: counts?.published },
              { id: 'rejected', label: 'Rejected', count: counts?.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewStatusTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  reviewStatusTab === tab.id
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-600'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                {tab.label} <span className="ml-1.5 rounded-full bg-zinc-950 px-2 py-0.5 text-xs text-zinc-400 border border-zinc-800">{tab.count ?? 0}</span>
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500 font-medium">Click &quot;Edit Car Data&quot; on any card to update vehicle specifications.</span>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">No {reviewStatusTab} records found.</p>
        ) : (
          <div className="space-y-5">
            {sortedPending.map((car) => (
              <ReviewCard
                key={car._id}
                car={car}
                getToken={getToken}
                onDone={refresh}
                onEdit={(c) => {
                  setEditingCar(c)
                  setShowManualModal(true)
                }}
              />
            ))}
          </div>
        )}
      </section>

      <ManualCarModal
        key={editingCar?._id || (showManualModal ? 'new' : 'closed')}
        isOpen={showManualModal}
        onClose={() => {
          setShowManualModal(false)
          setEditingCar(null)
        }}
        onCarCreated={handleManualCarCreated}
        onCarUpdated={handleManualCarUpdated}
        carToEdit={editingCar}
        canUploadImage={canUploadImage}
        getToken={getToken}
      />
    </main>
  )
}

export default AdminCarsPage

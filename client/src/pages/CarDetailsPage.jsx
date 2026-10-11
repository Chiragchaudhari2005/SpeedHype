import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link, useParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const fields = [
  ['engine', 'Engine'],
  ['horsepower', 'Horsepower'],
  ['torque', 'Torque'],
  ['mileage', 'Mileage'],
  ['fuelType', 'Fuel type'],
  ['transmission', 'Transmission'],
  ['seatingCapacity', 'Seating capacity'],
]

const CarDetailsPage = () => {
  const { getToken } = useAuth()
  const { carId } = useParams()
  const [car, setCar] = useState(null)
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    authenticatedRequest(getToken, 'GET', `/car-catalog/${carId}`)
      .then((response) => {
        if (!active) return
        setCar(response.data.car)
        setVariants(response.data.variants)
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Car details could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [getToken, carId])

  if (loading) return <div className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900 p-10" />
  if (error || !car) return <div role="alert" className="mx-auto max-w-5xl rounded-xl border border-red-900 bg-red-950/50 p-5 text-red-200">{error || 'Car not found.'}<div><Link to="/cars" className="mt-3 inline-block text-sm font-bold underline">Back to cars</Link></div></div>

  const price = car.priceAmount == null
    ? 'Price not listed'
    : car.priceCurrency
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: car.priceCurrency, maximumFractionDigits: 0 }).format(car.priceAmount)
      : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(car.priceAmount)} · currency not listed`

  return (
    <main className="mx-auto max-w-5xl">
      <Link to="/cars" className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors mb-4">
        <span>←</span> Back to car database
      </Link>

      <header className="mb-7 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md border border-red-900/70 bg-red-950/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
              {car.category}
            </span>
            <span className="font-mono text-xs font-bold text-zinc-400">
              Model Year {car.launchYear}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {car.brand} {car.model}
          </h1>
          <p className="mt-1 text-base sm:text-lg text-zinc-300 font-medium">
            {car.variant || 'Standard Spec Variant'}
          </p>
        </div>

        <Link
          to={`/compare?cars=${car._id}`}
          className="self-start sm:self-auto rounded-xl border border-zinc-700/80 bg-zinc-900/90 hover:bg-zinc-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:border-zinc-500 flex items-center gap-2 shadow-sm"
        >
          <span>⚖️</span> Compare with another car
        </Link>
      </header>

      {car.images?.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {car.images.map((image, index) => (
            <figure key={`${image.url}-${index}`} className={index === 0 ? 'sm:col-span-2' : ''}>
              <img
                src={image.url}
                alt={image.alt || `${car.brand} ${car.model}`}
                referrerPolicy="no-referrer"
                className="max-h-[32rem] w-full rounded-2xl border border-zinc-800 object-cover shadow-lg"
              />
              {image.attribution && <figcaption className="mt-1.5 text-xs text-zinc-400 px-1">{image.attribution}</figcaption>}
            </figure>
          ))}
        </div>
      ) : (
        <div className="flex aspect-[16/7] items-end rounded-2xl border border-zinc-800 bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950 p-8 text-8xl font-black italic text-white/10 shadow-lg">
          {car.brand.charAt(0)}
        </div>
      )}

      {/* Pricing & Verification Banner */}
      <section className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-5 sm:p-7 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Ex-Showroom Price</p>
            <p className="mt-1 text-2xl sm:text-4xl font-black text-white font-mono">{price}</p>
          </div>
          <p className="text-xs text-zinc-400">
            Market: India · Verified Data · Checked {car.sourceVerifiedAt ? new Date(car.sourceVerifiedAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        {/* Specifications Grid */}
        <h2 className="mb-4 mt-6 text-lg sm:text-xl font-bold text-white">Technical Specifications</h2>
        <dl className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {fields.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3 sm:p-4">
              <dt className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</dt>
              <dd className="mt-1 text-xs sm:text-sm font-bold text-zinc-100 font-mono">
                {car[key] == null || car[key] === ''
                  ? 'Not listed'
                  : `${car[key]}${car[`${key}Unit`] ? ` ${car[`${key}Unit`]}` : ''}`}
              </dd>
            </div>
          ))}
          {Object.entries(car.specifications || {}).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3 sm:p-4">
              <dt className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</dt>
              <dd className="mt-1 text-xs sm:text-sm font-bold text-zinc-100 font-mono">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {variants.length > 1 && (
        <section className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-5 sm:p-7">
          <h2 className="text-lg sm:text-xl font-bold text-white">Available Lineup Variants ({variants.length})</h2>
          <div className="mt-4 divide-y divide-zinc-800/60">
            {variants.map((variant) => (
              <Link
                key={variant._id}
                to={`/cars/catalog/${variant._id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 hover:text-red-300 transition-colors group"
              >
                <div>
                  <span className="font-bold text-white group-hover:text-red-300">{variant.variant || 'Standard'}</span>
                  <span className="ml-2 text-xs text-zinc-400">
                    {variant.fuelType || 'Fuel N/A'} · {variant.transmission || 'Trans N/A'}
                  </span>
                </div>
                <span className="font-mono font-bold text-sm sm:text-base text-zinc-200">
                  {variant.priceAmount == null
                    ? 'Price not listed'
                    : variant.priceCurrency
                      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: variant.priceCurrency, maximumFractionDigits: 0 }).format(variant.priceAmount)
                      : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(variant.priceAmount)}`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-5 text-xs sm:text-sm text-zinc-400">
        <p className="font-bold text-zinc-200">Official Source Attribution</p>
        <p className="mt-1.5 leading-relaxed">
          Source: {car.sourceName}{car.sourceTitle ? ` · ${car.sourceTitle}` : ''} · License: {car.sourceLicense}
        </p>
        {car.sourceLicenseUrl && (
          <a href={car.sourceLicenseUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-red-400 hover:text-red-300 underline">
            Source license details
          </a>
        )}
        <a href={car.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-red-400 hover:text-red-300 underline">
          View original vehicle source →
        </a>
        {Object.entries(car.fieldSources || {}).length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-zinc-300 hover:text-white">Specification Evidence Quotes</summary>
            <dl className="mt-3 space-y-3">
              {Object.entries(car.fieldSources).map(([field, provenance]) => (
                <div key={field} className="border-l-2 border-red-500/60 pl-3">
                  <dt className="font-semibold text-zinc-200">{field}</dt>
                  <dd className="mt-0.5 text-zinc-400 italic">“{provenance.quote}”</dd>
                  <dd className="mt-0.5">
                    <a href={provenance.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-red-400 hover:text-red-300 underline text-xs">
                      {provenance.sourceTitle || provenance.sourceName || 'Source Link'}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </footer>
    </main>
  )
}

export default CarDetailsPage

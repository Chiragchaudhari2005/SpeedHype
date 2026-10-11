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
      <Link to="/cars" className="text-sm font-semibold text-zinc-400 hover:text-white">← Back to car database</Link>
      <header className="mb-7 mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-400">{car.category} · {car.launchYear}</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">{car.brand} {car.model}</h1>
          <p className="mt-2 text-lg text-zinc-400">{car.variant || 'Variant not stated by source'}</p>
        </div>
        <Link
          to={`/compare?cars=${car._id}`}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:border-zinc-500 hover:bg-zinc-800 flex items-center gap-2 shadow-sm"
        >
          <span>⚖️</span> Compare with another car
        </Link>
      </header>

      {car.images?.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {car.images.map((image, index) => (
            <figure key={`${image.url}-${index}`} className={index === 0 ? 'sm:col-span-2' : ''}>
              <img src={image.url} alt={image.alt || `${car.brand} ${car.model}`} referrerPolicy="no-referrer" className="max-h-[32rem] w-full rounded-2xl border border-zinc-800 object-cover" />
              {image.attribution && <figcaption className="mt-1 text-xs text-zinc-500">{image.attribution}</figcaption>}
            </figure>
          ))}
        </div>
      ) : (
        <div className="flex aspect-[16/7] items-end rounded-2xl border border-zinc-800 bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950 p-8 text-8xl font-black italic text-white/10">{car.brand.charAt(0)}</div>
      )}

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-5">
          <div><p className="text-sm text-zinc-400">Starting price</p><p className="mt-1 text-3xl font-black">{price}</p></div>
          <p className="text-sm text-zinc-500">Market: India · Admin-approved · sources last checked {car.sourceVerifiedAt ? new Date(car.sourceVerifiedAt).toLocaleDateString() : 'n/a'}</p>
        </div>
        <h2 className="mb-4 mt-6 text-xl font-bold">Specifications</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([key, label]) => (
            <div key={key} className="rounded-xl bg-zinc-800/70 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
              <dd className="mt-1 font-semibold">{car[key] == null || car[key] === ''
                ? 'Not listed by source'
                : `${car[key]}${car[`${key}Unit`] ? ` ${car[`${key}Unit`]}` : ''}`}</dd>
            </div>
          ))}
          {Object.entries(car.specifications || {}).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-zinc-800/70 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
          ))}
        </dl>
      </section>

      {variants.length > 1 && (
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
          <h2 className="text-xl font-bold">Available variants</h2>
          <div className="mt-4 divide-y divide-zinc-800">
            {variants.map((variant) => (
              <Link key={variant._id} to={`/cars/catalog/${variant._id}`} className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-red-300">
                <span><span className="font-semibold">{variant.variant || 'Variant not stated'}</span><span className="ml-2 text-sm text-zinc-500">{variant.fuelType || 'Fuel not listed'} · {variant.transmission || 'Transmission not listed'}</span></span>
                <span className="font-bold">{variant.priceAmount == null ? 'Price not listed' : variant.priceCurrency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: variant.priceCurrency, maximumFractionDigits: 0 }).format(variant.priceAmount) : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(variant.priceAmount)} · currency not listed`}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
        <p className="font-bold text-zinc-200">Source attribution</p>
        <p className="mt-2">Source: {car.sourceName}{car.sourceTitle ? ` · ${car.sourceTitle}` : ''} · License/terms: {car.sourceLicense}</p>
        {car.sourceLicenseUrl && <a href={car.sourceLicenseUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-red-300 underline">Source license details</a>}
        <a href={car.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-red-300 underline">View original vehicle source</a>
        {Object.entries(car.fieldSources || {}).length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-zinc-300">Specification evidence</summary>
            <dl className="mt-3 space-y-3">
              {Object.entries(car.fieldSources).map(([field, provenance]) => (
                <div key={field} className="border-l-2 border-zinc-700 pl-3">
                  <dt className="font-semibold text-zinc-300">{field}</dt>
                  <dd className="mt-1 text-zinc-400">“{provenance.quote}”</dd>
                  <dd className="mt-1">
                    <a href={provenance.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-red-300 underline">
                      {provenance.sourceTitle || provenance.sourceName || 'Source'}
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

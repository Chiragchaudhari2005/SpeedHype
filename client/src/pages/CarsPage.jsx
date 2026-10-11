import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const categories = [
  ['all', 'All categories'],
  ['hatchback', 'Hatchback'],
  ['sedan', 'Sedan'],
  ['suv', 'SUV'],
  ['truck', 'Truck'],
  ['coupe', 'Coupe'],
  ['convertible', 'Convertible'],
  ['electric', 'Electric'],
  ['hybrid', 'Hybrid'],
]

const formatPrice = (amount, currency = '') => {
  if (amount == null) return 'Price not listed'
  if (!currency) return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)} · currency not listed`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

const CarsPage = () => {
  const { getToken } = useAuth()
  const [cars, setCars] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [fuelType, setFuelType] = useState('')
  const [transmission, setTransmission] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCars = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' })
      if (search.trim()) params.set('search', search.trim())
      if (category !== 'all') params.set('category', category)
      if (fuelType) params.set('fuelType', fuelType)
      if (transmission) params.set('transmission', transmission)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      const response = await authenticatedRequest(getToken, 'GET', `/car-catalog?${params}`)
      setCars(response.data.cars)
      setPagination(response.data.pagination)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The car catalog could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [getToken, page, search, category, fuelType, transmission, minPrice, maxPrice])

  useEffect(() => {
    const timeout = window.setTimeout(loadCars, 250)
    return () => window.clearTimeout(timeout)
  }, [loadCars])

  const updateFilter = (setter) => (event) => {
    setter(event.target.value)
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setCategory('all')
    setFuelType('')
    setTransmission('')
    setMinPrice('')
    setMaxPrice('')
    setPage(1)
  }

  return (
    <main className="mx-auto max-w-7xl">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-900/60 bg-red-950/50 text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Verified Vehicle Specifications
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">Cars</h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed">
            Explore sourced specifications, official ex-showroom prices, dimensions, and powertrain telemetry with zero invented values.
          </p>
        </div>
        <Link
          to="/cars/new"
          className="self-start sm:self-auto rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] flex items-center gap-1.5"
        >
          <span>+</span> Add community launch
        </Link>
      </header>

      <section className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-4 sm:p-6 backdrop-blur-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="mb-2 block text-xs sm:text-sm font-semibold text-zinc-300">Search Brand, Model, or Variant</span>
            <input
              value={search}
              onChange={updateFilter(setSearch)}
              placeholder="e.g. Tata Nexon, Mahindra XUV700"
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-4 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs sm:text-sm font-semibold text-zinc-300">Body Type</span>
            <select
              value={category}
              onChange={updateFilter(setCategory)}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            >
              {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs sm:text-sm font-semibold text-zinc-300">Fuel Type</span>
            <input
              value={fuelType}
              onChange={updateFilter(setFuelType)}
              placeholder="Petrol, Diesel, EV…"
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
          </label>
          <label>
            <span className="mb-2 block text-xs sm:text-sm font-semibold text-zinc-300">Transmission</span>
            <input
              value={transmission}
              onChange={updateFilter(setTransmission)}
              placeholder="Manual, Automatic…"
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
            />
          </label>
          <div>
            <span className="mb-2 block text-xs sm:text-sm font-semibold text-zinc-300">Price Range (₹)</span>
            <div className="flex gap-2">
              <input
                aria-label="Minimum price"
                type="number"
                min="0"
                value={minPrice}
                onChange={updateFilter(setMinPrice)}
                placeholder="Min"
                className="min-w-0 w-1/2 rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500 transition-all font-mono"
              />
              <input
                aria-label="Maximum price"
                type="number"
                min="0"
                value={maxPrice}
                onChange={updateFilter(setMaxPrice)}
                placeholder="Max"
                className="min-w-0 w-1/2 rounded-xl border border-zinc-700/80 bg-zinc-950/80 px-3 py-2.5 sm:py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-4 text-xs sm:text-sm">
          <p className="text-zinc-400 font-medium">
            <span className="text-white font-bold">{pagination.total}</span> verified {pagination.total === 1 ? 'vehicle' : 'vehicles'} in catalog
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-zinc-700/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Reset filters
          </button>
        </div>
      </section>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">{error}</p>}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-88 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" />
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-5 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-xl text-red-400 mb-3">
            🔍
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">No vehicles match those filters</h2>
          <p className="mt-2 text-sm text-zinc-400">Try broadening your search term or price range.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <article
                key={car._id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:bg-zinc-900 shadow-sm"
              >
                <Link to={`/cars/catalog/${car._id}`} className="block relative overflow-hidden bg-zinc-950 aspect-[16/10]">
                  {car.images?.[0]?.url ? (
                    <img
                      src={car.images[0].url}
                      alt={car.images[0].alt || `${car.brand} ${car.model}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-end bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950 p-5">
                      <span className="text-7xl font-black italic text-white/10">{car.brand.charAt(0)}</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 rounded-md border border-black/40 bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {car.category}
                  </span>
                  <span className="absolute top-3 right-3 rounded-md border border-black/40 bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono font-bold text-red-400">
                    {car.launchYear}
                  </span>
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg sm:text-xl font-black text-white group-hover:text-red-300 transition-colors">
                    {car.brand} {car.model}
                  </h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-zinc-400 truncate">{car.variant || 'Standard Spec'}</p>

                  <div className="mt-3.5 pb-3 border-b border-zinc-800/60">
                    <span className="block text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Ex-Showroom Price</span>
                    <p className="mt-0.5 text-xl font-extrabold text-white font-mono">
                      {formatPrice(car.priceAmount, car.priceCurrency)}
                    </p>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/60 p-2.5">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Fuel</span>
                      <span className="mt-0.5 block font-bold text-zinc-200 truncate">{car.fuelType || 'Not listed'}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/60 p-2.5">
                      <span className="block text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Transmission</span>
                      <span className="mt-0.5 block font-bold text-zinc-200 truncate">{car.transmission || 'Not listed'}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-5 gap-2">
                    <Link
                      to={`/cars/catalog/${car._id}`}
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                      View Specs <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      to={`/compare?cars=${car._id}`}
                      className="rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span>⚖️</span> Compare
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {pagination.pages > 1 && (
            <nav aria-label="Car catalog pages" className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold disabled:opacity-40 hover:bg-zinc-800 transition-colors"
              >
                ← Previous
              </button>
              <span className="text-xs sm:text-sm font-mono text-zinc-400 px-2">
                Page {page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-xl border border-zinc-700/80 bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold disabled:opacity-40 hover:bg-zinc-800 transition-colors"
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export default CarsPage

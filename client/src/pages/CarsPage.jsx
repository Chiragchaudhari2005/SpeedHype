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
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-400">SpeedHype garage</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Car database</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Explore India-market cars with sourced specifications, clear attribution, and no guessed figures.</p>
        </div>
        <Link to="/cars/new" className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white hover:brightness-110">
          + Add community launch
        </Link>
      </header>

      <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <label className="lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-zinc-300">Search brand, model, or variant</span>
            <input value={search} onChange={updateFilter(setSearch)} placeholder="e.g. Tata Nexon" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-zinc-300">Category</span>
            <select value={category} onChange={updateFilter(setCategory)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500">
              {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-zinc-300">Fuel type</span>
            <input value={fuelType} onChange={updateFilter(setFuelType)} placeholder="Any fuel" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-zinc-300">Transmission</span>
            <input value={transmission} onChange={updateFilter(setTransmission)} placeholder="Any" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
          </label>
          <div>
            <span className="mb-2 block text-sm font-semibold text-zinc-300">Price range (₹)</span>
            <div className="flex gap-2">
              <input aria-label="Minimum price" type="number" min="0" value={minPrice} onChange={updateFilter(setMinPrice)} placeholder="Min" className="min-w-0 w-1/2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
              <input aria-label="Maximum price" type="number" min="0" value={maxPrice} onChange={updateFilter(setMaxPrice)} placeholder="Max" className="min-w-0 w-1/2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-red-500" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          <p className="text-sm text-zinc-400">{pagination.total} sourced {pagination.total === 1 ? 'car' : 'cars'} · latest model years first</p>
          <button type="button" onClick={resetFilters} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Reset filters</button>
        </div>
      </section>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">{error}</p>}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />)}
        </div>
      ) : cars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 px-5 py-16 text-center">
          <h2 className="text-xl font-bold">No cars match those filters</h2>
          <p className="mt-2 text-sm text-zinc-400">Try a broader search or reset the selected filters.</p>
          <button type="button" onClick={resetFilters} className="mt-5 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-bold hover:bg-zinc-700">Clear filters</button>
        </div>
      ) : (
        <>
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <article key={car._id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-600">
                <Link to={`/cars/catalog/${car._id}`} className="group block">
                  {car.images?.[0]?.url ? (
                    <img src={car.images[0].url} alt={car.images[0].alt || `${car.brand} ${car.model}`} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/10] items-end bg-gradient-to-br from-red-950 via-zinc-900 to-zinc-950 p-5">
                      <span className="text-7xl font-black italic text-white/10">{car.brand.charAt(0)}</span>
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-red-900/70 bg-red-950/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300">{car.category}</span>
                    <span className="text-sm text-zinc-400">{car.launchYear}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black">{car.brand} {car.model}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{car.variant}</p>
                  <p className="mt-4 text-lg font-extrabold text-white">{formatPrice(car.priceAmount, car.priceCurrency)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <p className="rounded-lg bg-zinc-800/80 p-3"><span className="block text-xs text-zinc-500">Fuel</span><span className="mt-1 block font-semibold">{car.fuelType || 'Not listed'}</span></p>
                    <p className="rounded-lg bg-zinc-800/80 p-3"><span className="block text-xs text-zinc-500">Transmission</span><span className="mt-1 block font-semibold">{car.transmission || 'Not listed'}</span></p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <Link to={`/cars/catalog/${car._id}`} className="text-sm font-bold text-red-300 hover:text-red-200">
                      Specs <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      to={`/compare?cars=${car._id}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                    >
                      ⚖️ Compare
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {pagination.pages > 1 && (
            <nav aria-label="Car catalog pages" className="mt-8 flex items-center justify-center gap-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
              <span className="text-sm text-zinc-400">Page {page} of {pagination.pages}</span>
              <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export default CarsPage

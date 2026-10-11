import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link, useSearchParams } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const formatPrice = (amount, currency = '') => {
  if (amount == null) return 'Price not listed'
  if (!currency) return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)} · currency not listed`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

const standardSpecRows = [
  { section: 'Key Details', label: 'Starting Price', getVal: (car) => formatPrice(car.priceAmount, car.priceCurrency) },
  { section: 'Key Details', label: 'Category', getVal: (car) => car.category ? car.category.toUpperCase() : null },
  { section: 'Key Details', label: 'Model Year', getVal: (car) => car.launchYear ? String(car.launchYear) : null },
  { section: 'Key Details', label: 'Seating Capacity', getVal: (car) => car.seatingCapacity != null ? `${car.seatingCapacity} Persons` : null },

  { section: 'Powertrain & Performance', label: 'Fuel Type', getVal: (car) => car.fuelType || null },
  { section: 'Powertrain & Performance', label: 'Transmission', getVal: (car) => car.transmission || null },
  { section: 'Powertrain & Performance', label: 'Engine Capacity', getVal: (car) => car.engine || null },
  { section: 'Powertrain & Performance', label: 'Power / Horsepower', getVal: (car) => car.horsepower != null ? `${car.horsepower} ${car.horsepowerUnit || 'bhp'}` : null },
  { section: 'Powertrain & Performance', label: 'Peak Torque', getVal: (car) => car.torque != null ? `${car.torque} ${car.torqueUnit || 'Nm'}` : null },
  { section: 'Powertrain & Performance', label: 'Mileage / Range', getVal: (car) => car.mileage != null ? `${car.mileage} ${car.mileageUnit || 'kmpl'}` : null },

  { section: 'Dimensions & Capacity', label: 'Length', getVal: (car) => car.specifications?.['Length'] || car.specifications?.['length'] || null },
  { section: 'Dimensions & Capacity', label: 'Width', getVal: (car) => car.specifications?.['Width'] || car.specifications?.['width'] || null },
  { section: 'Dimensions & Capacity', label: 'Height', getVal: (car) => car.specifications?.['Height'] || car.specifications?.['height'] || null },
  { section: 'Dimensions & Capacity', label: 'Wheelbase', getVal: (car) => car.specifications?.['Wheelbase'] || car.specifications?.['wheelbase'] || null },
  { section: 'Dimensions & Capacity', label: 'Ground Clearance', getVal: (car) => car.specifications?.['Ground Clearance'] || car.specifications?.['ground clearance'] || null },
  { section: 'Dimensions & Capacity', label: 'Boot Space', getVal: (car) => car.specifications?.['Boot Space'] || car.specifications?.['boot space'] || null },
  { section: 'Dimensions & Capacity', label: 'Battery Capacity (EV)', getVal: (car) => car.specifications?.['Battery Capacity'] || car.specifications?.['battery capacity'] || null },
]

export default function ComparePage() {
  const { getToken } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [highlightDifferences, setHighlightDifferences] = useState(false)

  // Selector modal state
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [targetSlotIndex, setTargetSlotIndex] = useState(null)
  const [catalogCars, setCatalogCars] = useState([])
  const [selectorSearch, setSelectorSearch] = useState('')
  const [searchingCatalog, setSearchingCatalog] = useState(false)

  // Parse car IDs from URL param (e.g. ?cars=id1,id2)
  const carIdsFromUrl = useMemo(() => {
    const raw = searchParams.get('cars') || searchParams.get('ids') || ''
    return raw.split(',').map((id) => id.trim()).filter(Boolean)
  }, [searchParams])

  // Load cars for comparison
  const loadComparison = useCallback(async () => {
    if (!carIdsFromUrl.length) {
      // If no IDs in URL, fetch initial 2 cars from catalog to give a rich first impression
      try {
        setLoading(true)
        const response = await authenticatedRequest(getToken, 'GET', '/car-catalog?limit=2')
        if (response.data?.cars?.length >= 2) {
          const defaultIds = response.data.cars.map((c) => c._id)
          setSearchParams({ cars: defaultIds.join(',') }, { replace: true })
        } else {
          setCars(response.data?.cars || [])
          setLoading(false)
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load initial comparison.')
        setLoading(false)
      }
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await authenticatedRequest(getToken, 'GET', `/car-catalog/compare?ids=${carIdsFromUrl.join(',')}`)
      setCars(response.data?.cars || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load cars for comparison.')
    } finally {
      setLoading(false)
    }
  }, [getToken, carIdsFromUrl, setSearchParams])

  useEffect(() => {
    const timer = window.setTimeout(loadComparison, 0)
    return () => window.clearTimeout(timer)
  }, [loadComparison])

  // Fetch catalog vehicles for the selector modal
  const searchCatalog = useCallback(async (query = '') => {
    setSearchingCatalog(true)
    try {
      const params = new URLSearchParams({ limit: '18' })
      if (query.trim()) params.set('search', query.trim())
      const response = await authenticatedRequest(getToken, 'GET', `/car-catalog?${params}`)
      setCatalogCars(response.data?.cars || [])
    } catch {
      // keep existing catalog cars on error
    } finally {
      setSearchingCatalog(false)
    }
  }, [getToken])

  const openVehicleSelector = (slotIndex) => {
    setTargetSlotIndex(slotIndex)
    setSelectorSearch('')
    setSelectorOpen(true)
    searchCatalog('')
  }

  const handleSelectorSearchChange = (e) => {
    const val = e.target.value
    setSelectorSearch(val)
    searchCatalog(val)
  }

  const handleSelectCarForSlot = (selectedCar) => {
    const newCars = [...cars]
    if (targetSlotIndex != null && targetSlotIndex < newCars.length) {
      // Replace existing slot
      newCars[targetSlotIndex] = selectedCar
    } else {
      // Add as new slot
      newCars.push(selectedCar)
    }

    const uniqueIds = [...new Set(newCars.map((c) => c._id))].slice(0, 4)
    setSearchParams({ cars: uniqueIds.join(',') })
    setSelectorOpen(false)
    setTargetSlotIndex(null)
  }

  const handleRemoveCar = (indexToRemove) => {
    const updated = cars.filter((_, i) => i !== indexToRemove)
    setCars(updated)
    const newIds = updated.map((c) => c._id)
    if (newIds.length) {
      setSearchParams({ cars: newIds.join(',') })
    } else {
      setSearchParams({})
    }
  }

  const handleClearAll = () => {
    setCars([])
    setSearchParams({})
  }

  // Dynamic extra specifications across compared cars
  const extraSpecKeys = useMemo(() => {
    const knownKeys = new Set([
      'length', 'width', 'height', 'wheelbase', 'ground clearance',
      'boot space', 'battery capacity',
    ])
    const keys = new Set()
    cars.forEach((car) => {
      Object.keys(car.specifications || {}).forEach((key) => {
        if (!knownKeys.has(key.toLowerCase())) {
          keys.add(key)
        }
      })
    })
    return Array.from(keys).sort()
  }, [cars])

  // Helper to check if a row differs across compared cars
  const checkRowDiffers = (getValueFn) => {
    if (cars.length < 2) return false
    const values = cars.map((c) => getValueFn(c) ?? '—')
    return new Set(values).size > 1
  }

  return (
    <main className="mx-auto max-w-7xl px-2 sm:px-4">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-950 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-800/60">
              SpeedHype Duel
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Car Specification Comparison</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Compare India-market vehicles head-to-head. Zero guessed numbers; genuinely missing figures stay unstated.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {cars.length >= 2 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={highlightDifferences}
                onChange={(e) => setHighlightDifferences(e.target.checked)}
                className="rounded border-zinc-700 text-red-600 focus:ring-0"
              />
              Highlight Differences
            </label>
          )}

          {cars.length < 4 && (
            <button
              type="button"
              onClick={() => openVehicleSelector(cars.length)}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500 shadow-sm"
            >
              + Add Vehicle ({cars.length}/4)
            </button>
          )}

          {cars.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-xl border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              Clear All
            </button>
          )}
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-96 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="my-12 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-2xl">
            ⚖️
          </div>
          <h2 className="mt-4 text-2xl font-black">No vehicles selected for comparison</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Pick 2 to 4 cars from the live catalogue to view complete side-by-side technical specs, dimensions, and pricing differences.
          </p>
          <button
            type="button"
            onClick={() => openVehicleSelector(0)}
            className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 transition"
          >
            + Choose First Vehicle
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Vehicle Cards Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cars.map((car, index) => (
              <div
                key={car._id}
                className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
              >
                {/* Remove button */}
                <button
                  type="button"
                  title="Remove from comparison"
                  onClick={() => handleRemoveCar(index)}
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs text-zinc-300 backdrop-blur hover:bg-red-900 hover:text-white"
                >
                  ✕
                </button>

                <div>
                  {/* Photo or Monogram */}
                  <div className="relative mb-3 overflow-hidden rounded-xl bg-zinc-950">
                    {car.images?.[0]?.url ? (
                      <img
                        src={car.images[0].url}
                        alt={car.images[0].alt || `${car.brand} ${car.model}`}
                        referrerPolicy="no-referrer"
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-red-950/40 via-zinc-900 to-zinc-950 text-4xl font-black italic text-white/10">
                        {car.brand.charAt(0)}
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400 backdrop-blur">
                      {car.category || 'Vehicle'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-zinc-400">{car.brand} · {car.launchYear}</p>
                  <h3 className="text-lg font-black text-white">{car.model}</h3>
                  <p className="text-xs text-zinc-400 truncate">{car.variant || 'Base model'}</p>

                  <div className="mt-3">
                    <span className="text-xs text-zinc-500 block">Ex-Showroom Price</span>
                    <span className="text-xl font-black text-emerald-400">
                      {formatPrice(car.priceAmount, car.priceCurrency)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-zinc-800/80 pt-3">
                  <button
                    type="button"
                    onClick={() => openVehicleSelector(index)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/60 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  >
                    Change
                  </button>
                  <Link
                    to={`/cars/catalog/${car._id}`}
                    className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-600 hover:text-white transition"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            ))}

            {/* Empty slots up to 4 */}
            {cars.length < 4 && (
              <button
                type="button"
                onClick={() => openVehicleSelector(cars.length)}
                className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/30 p-6 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold">
                  +
                </span>
                <span className="mt-3 text-sm font-bold">Add Vehicle ({cars.length + 1} of 4)</span>
                <span className="mt-1 text-xs text-zinc-600">Select another vehicle to compare</span>
              </button>
            )}
          </div>

          {/* Comparison Matrix Table */}
          {cars.length >= 2 ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/90 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950">
                      <th className="p-3.5 sm:p-4 font-bold text-zinc-400 min-w-[150px] sm:min-w-[200px] sticky left-0 bg-zinc-950 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.5)]">
                        Specification
                      </th>
                      {cars.map((car) => (
                        <th key={car._id} className="p-3.5 sm:p-4 font-black text-white min-w-[180px] sm:min-w-[220px]">
                          {car.brand} {car.model}
                          <span className="block text-xs font-normal text-zinc-400 truncate">{car.variant || 'Base model'}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-800/60">
                    {/* Standard Specs by Section */}
                    {['Key Details', 'Powertrain & Performance', 'Dimensions & Capacity'].map((sectionName) => {
                      const sectionRows = standardSpecRows.filter((r) => r.section === sectionName)
                      return (
                        <tr key={sectionName} className="contents">
                          <tr className="bg-zinc-950/90 border-y border-zinc-800/80">
                            <td
                              colSpan={cars.length + 1}
                              className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 sticky left-0 bg-zinc-950/90"
                            >
                              {sectionName}
                            </td>
                          </tr>

                          {sectionRows.map((row) => {
                            const isDifferent = checkRowDiffers(row.getVal)
                            const highlightClass = highlightDifferences && isDifferent
                              ? 'bg-amber-950/30'
                              : ''

                            return (
                              <tr key={row.label} className={`transition hover:bg-zinc-800/40 ${highlightClass}`}>
                                <td className="p-3.5 sm:p-4 font-semibold text-zinc-300 sticky left-0 bg-zinc-950/95 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.5)]">
                                  {row.label}
                                  {highlightDifferences && isDifferent && (
                                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title="Differs between vehicles" />
                                  )}
                                </td>
                                {cars.map((car) => {
                                  const val = row.getVal(car)
                                  return (
                                    <td key={car._id} className="p-3.5 sm:p-4">
                                      {val != null && val !== '' ? (
                                        <span className="font-mono font-medium text-white">{val}</span>
                                      ) : (
                                        <span className="text-zinc-600 italic">Not stated</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {/* Additional Sourced Specifications */}
                    {extraSpecKeys.length > 0 && (
                      <>
                        <tr className="bg-zinc-950/90 border-y border-zinc-800/80">
                          <td
                            colSpan={cars.length + 1}
                            className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 sticky left-0 bg-zinc-950/90"
                          >
                            Additional Sourced Specifications
                          </td>
                        </tr>

                        {extraSpecKeys.map((specKey) => {
                          const getSpecVal = (car) => car.specifications?.[specKey] || null
                          const isDifferent = checkRowDiffers(getSpecVal)
                          const highlightClass = highlightDifferences && isDifferent ? 'bg-amber-950/30' : ''

                          return (
                            <tr key={specKey} className={`transition hover:bg-zinc-800/40 ${highlightClass}`}>
                              <td className="p-3.5 sm:p-4 font-semibold text-zinc-300 sticky left-0 bg-zinc-950/95 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.5)]">
                                {specKey}
                                {highlightDifferences && isDifferent && (
                                  <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title="Differs between vehicles" />
                                )}
                              </td>
                              {cars.map((car) => {
                                const val = getSpecVal(car)
                                return (
                                  <td key={car._id} className="p-3.5 sm:p-4">
                                    {val != null && val !== '' ? (
                                      <span className="font-mono font-medium text-white">{val}</span>
                                    ) : (
                                      <span className="text-zinc-600 italic">Not stated</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </>
                    )}

                    {/* Source Attribution Section */}
                    <tr className="bg-zinc-950/90 border-y border-zinc-800/80">
                      <td
                        colSpan={cars.length + 1}
                        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 sticky left-0 bg-zinc-950/90"
                      >
                        Verification &amp; Source Attribution
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-800/40">
                      <td className="p-3.5 sm:p-4 font-semibold text-zinc-300 sticky left-0 bg-zinc-950/95 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.5)]">
                        Official Source
                      </td>
                      {cars.map((car) => (
                        <td key={car._id} className="p-3.5 sm:p-4 text-xs">
                          <p className="font-bold text-white">{car.sourceName || 'Manufacturer Press'}</p>
                          {car.sourceTitle && <p className="mt-0.5 text-zinc-400">{car.sourceTitle}</p>}
                          {car.sourceUrl && (
                            <a
                              href={car.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-block text-red-400 underline hover:text-red-300 break-all"
                            >
                              View source document ↗
                            </a>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
              <p className="text-zinc-400">Add at least one more vehicle above to generate the side-by-side comparison matrix.</p>
            </div>
          )}
        </div>
      )}

      {/* Vehicle Selector Modal */}
      {selectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative my-8 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">Select Vehicle to Compare</h3>
                <p className="text-xs text-zinc-400">Search published vehicles in the SpeedHype catalog.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Search input */}
            <div className="border-b border-zinc-800 bg-zinc-950/60 p-4">
              <input
                type="text"
                autoFocus
                value={selectorSearch}
                onChange={handleSelectorSearchChange}
                placeholder="Search by brand or model (e.g. Tata Nexon, Creta, Swift)..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none focus:border-red-500"
              />
            </div>

            {/* Vehicle List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {searchingCatalog ? (
                <div className="py-12 text-center text-sm text-zinc-500">Searching catalogue...</div>
              ) : catalogCars.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-500">
                  No vehicles found matching &quot;{selectorSearch}&quot;.
                </div>
              ) : (
                catalogCars.map((car) => {
                  const alreadySelected = cars.some((c) => c._id === car._id)
                  return (
                    <button
                      key={car._id}
                      type="button"
                      disabled={alreadySelected}
                      onClick={() => handleSelectCarForSlot(car)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                        alreadySelected
                          ? 'border-zinc-800 bg-zinc-950/40 opacity-50 cursor-not-allowed'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-800/60'
                      }`}
                    >
                      {car.images?.[0]?.url ? (
                        <img
                          src={car.images[0].url}
                          alt={car.model}
                          referrerPolicy="no-referrer"
                          className="h-14 w-20 rounded-lg object-cover bg-zinc-900"
                        />
                      ) : (
                        <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-zinc-900 font-black text-zinc-700">
                          {car.brand.charAt(0)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{car.brand} {car.model}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                            {car.launchYear}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{car.variant || 'Standard'}</p>
                        <p className="text-xs font-semibold text-emerald-400 mt-1">
                          {formatPrice(car.priceAmount, car.priceCurrency)}
                        </p>
                      </div>

                      <div className="text-right text-xs">
                        {alreadySelected ? (
                          <span className="text-zinc-500">Selected</span>
                        ) : (
                          <span className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white">
                            Select
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 bg-zinc-950/80 px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setSelectorOpen(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
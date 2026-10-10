import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Link } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'

const CarsPage = () => {
  const { getToken } = useAuth()
  const [databaseVehicles, setDatabaseVehicles] = useState([])
  const [databaseLoading, setDatabaseLoading] = useState(true)
  const [databaseError, setDatabaseError] = useState('')

  useEffect(() => {
    let active = true
    authenticatedRequest(getToken, 'GET', '/cars')
      .then((response) => {
        if (active) setDatabaseVehicles(response.data.vehicles)
      })
      .catch((requestError) => {
        if (active) setDatabaseError(requestError.response?.data?.message || 'Database vehicles could not be loaded.')
      })
      .finally(() => {
        if (active) setDatabaseLoading(false)
      })
    return () => { active = false }
  }, [getToken])

  const cars = [
    {
      id: 1,
      make: 'Toyota',
      model: 'Supra MK5',
      year: '2024',
      type: 'Sports Car',
      engine: '3.0L Twin-Scroll Turbo I6',
      horsepower: '382 hp',
      torque: '368 lb-ft',
      price: '$53,000',
      rating: 4.8,
      imageColor: 'from-red-600 to-orange-600',
      features: ['Turbocharged', 'Rear-Wheel Drive', '8-Speed Auto', 'Launch Control']
    },
    {
      id: 2,
      make: 'Ford',
      model: 'Mustang GT',
      year: '2024',
      type: 'Muscle Car',
      engine: '5.0L Coyote V8',
      horsepower: '480 hp',
      torque: '415 lb-ft',
      price: '$42,000',
      rating: 4.6,
      imageColor: 'from-blue-600 to-cyan-600',
      features: ['Naturally Aspirated', 'V8 Engine', '6-Speed Manual', 'Track Apps']
    },
    {
      id: 3,
      make: 'Porsche',
      model: '911 Carrera',
      year: '2024',
      type: 'Sports Car',
      engine: '3.0L Twin-Turbo Flat-6',
      horsepower: '379 hp',
      torque: '331 lb-ft',
      price: '$113,000',
      rating: 4.9,
      imageColor: 'from-gray-600 to-zinc-600',
      features: ['Rear Engine', 'PDK Transmission', 'Active Suspension', 'Sport Chrono']
    },
    {
      id: 4,
      make: 'Tesla',
      model: 'Model 3 Performance',
      year: '2024',
      type: 'Electric Sedan',
      engine: 'Dual Motor AWD',
      horsepower: '510 hp',
      torque: '547 lb-ft',
      price: '$53,000',
      rating: 4.7,
      imageColor: 'from-green-600 to-emerald-600',
      features: ['Electric', 'AWD', '0-60: 3.1s', 'Autopilot']
    },
    {
      id: 5,
      make: 'BMW',
      model: 'M3 Competition',
      year: '2024',
      type: 'Sports Sedan',
      engine: '3.0L Twin-Turbo I6',
      horsepower: '503 hp',
      torque: '479 lb-ft',
      price: '$78,000',
      rating: 4.8,
      imageColor: 'from-blue-600 to-indigo-600',
      features: ['xDrive AWD', '8-Speed Auto', 'Carbon Fiber Roof', 'M Differential']
    },
    {
      id: 6,
      make: 'Chevrolet',
      model: 'Corvette Stingray',
      year: '2024',
      type: 'Sports Car',
      engine: '6.2L LT2 V8',
      horsepower: '495 hp',
      torque: '470 lb-ft',
      price: '$68,000',
      rating: 4.9,
      imageColor: 'from-yellow-600 to-amber-600',
      features: ['Mid-Engine', '8-Speed DCT', 'Magnetic Ride', 'Z51 Package']
    },
    {
      id: 7,
      make: 'Subaru',
      model: 'WRX STI',
      year: '2024',
      type: 'Sports Sedan',
      engine: '2.5L Turbo Flat-4',
      horsepower: '310 hp',
      torque: '290 lb-ft',
      price: '$38,000',
      rating: 4.5,
      imageColor: 'from-blue-600 to-cyan-600',
      features: ['Symmetrical AWD', '6-Speed Manual', 'SI-Drive', 'Recaro Seats']
    },
    {
      id: 8,
      make: 'Nissan',
      model: 'GT-R Nismo',
      year: '2024',
      type: 'Supercar',
      engine: '3.8L Twin-Turbo V6',
      horsepower: '600 hp',
      torque: '481 lb-ft',
      price: '$215,000',
      rating: 4.9,
      imageColor: 'from-red-600 to-pink-600',
      features: ['ATTESA AWD', '6-Speed DCT', 'Nismo Tune', 'Carbon Fiber']
    }
  ]

  const filters = {
    types: ['All', 'Sports Car', 'Muscle Car', 'Supercar', 'Electric', 'SUV', 'Sedan', 'Coupe'],
    priceRanges: ['All', 'Under $30k', '$30k - $60k', '$60k - $100k', '$100k+'],
    years: ['All', '2020-2024', '2015-2019', '2010-2014', '2000-2009'],
    features: ['Turbocharged', 'AWD', 'Manual', 'Electric', 'V8', 'Convertible']
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Cars</h1>
          <p className="text-zinc-400">Explore vehicle specifications, modifications, and performance data</p>
        </div>
        <Link to="/cars/new" className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white hover:brightness-110">
          + Add car launch
        </Link>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Make & Model</label>
            <input
              type="text"
              placeholder="Search cars..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle Type</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500">
              {filters.types.map((type, index) => (
                <option key={index}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Price Range</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500">
              {filters.priceRanges.map((range, index) => (
                <option key={index}>{range}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Year</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500">
              {filters.years.map((year, index) => (
                <option key={index}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Feature Filters */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-400 mb-3">Features</label>
          <div className="flex flex-wrap gap-2">
            {filters.features.map((feature, index) => (
              <button 
                key={index}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
              >
                {feature}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-zinc-400">
            Showing <span className="text-white font-medium">8</span> of <span className="text-white font-medium">142</span> vehicles
          </div>
          <div className="flex space-x-4">
            <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white font-medium">
              Reset Filters
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg text-white font-medium">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {(databaseLoading || databaseVehicles.length > 0 || databaseError) && (
        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Added by the community</p>
              <h2 className="mt-1 text-2xl font-bold">Latest car launches</h2>
            </div>
            <Link to="/feed" className="text-sm font-semibold text-red-400 hover:text-red-300">View in feed →</Link>
          </div>
          {databaseError && <p role="alert" className="mb-4 rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-200">{databaseError}</p>}
          {databaseLoading ? (
            <div className="h-52 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {databaseVehicles.slice(0, 6).map((vehicle) => (
                <article key={vehicle._id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  {vehicle.imageUrl ? (
                    <img src={vehicle.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/9] items-end bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950 p-5">
                      <span className="text-6xl font-black italic text-white/10">{vehicle.make?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">{vehicle.category} · {vehicle.year}</p>
                    <h3 className="mt-2 text-xl font-bold">{vehicle.make} {vehicle.model}</h3>
                    {vehicle.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{vehicle.summary}</p>}
                    <p className="mt-3 text-xs text-zinc-500">Added {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(vehicle.createdAt))}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Cars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cars.map((car) => (
          <div key={car.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:transform hover:-translate-y-1">
            {/* Car Image */}
            <div className={`h-48 bg-gradient-to-r ${car.imageColor} relative`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white opacity-80 mb-2">{car.make.charAt(0)}</div>
                  <div className="text-white opacity-90 font-medium">{car.make} {car.model}</div>
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 bg-black bg-opacity-60 backdrop-blur-sm rounded-full flex items-center">
                  <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white text-sm font-medium">{car.rating}</span>
                </div>
              </div>
            </div>

            {/* Car Info */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{car.make} {car.model}</h3>
                  <p className="text-zinc-400">{car.year} • {car.type}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{car.price}</div>
                  <div className="text-sm text-zinc-400">Starting MSRP</div>
                </div>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Engine</div>
                  <div className="font-medium">{car.engine}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Power</div>
                  <div className="font-medium">{car.horsepower}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Torque</div>
                  <div className="font-medium">{car.torque}</div>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-sm text-zinc-400 mb-1">Drive</div>
                  <div className="font-medium">RWD</div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <div className="text-sm text-zinc-400 mb-2">Key Features</div>
                <div className="flex flex-wrap gap-2">
                  {car.features.map((feature, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-lg">
                  View Details
                </button>
                <button className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium py-3 rounded-lg">
                  Compare
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-12">
        <div className="flex items-center space-x-2">
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
            1
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            2
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            3
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            ...
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            8
          </button>
          <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <h3 className="text-2xl font-bold mb-6">Vehicle Database Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">142</div>
            <div className="text-zinc-400">Total Vehicles</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">24</div>
            <div className="text-zinc-400">Electric Models</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">68</div>
            <div className="text-zinc-400">Performance Cars</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">892</div>
            <div className="text-zinc-400">User Reviews</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CarsPage
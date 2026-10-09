import { useState } from 'react'

const ComparePage = () => {
  const [selectedCars, setSelectedCars] = useState([1, 2]) // Default compare Toyota Supra and Ford Mustang

  const cars = [
    {
      id: 1,
      make: 'Toyota',
      model: 'Supra MK5',
      year: '2024',
      imageColor: 'from-red-600 to-orange-600',
      specs: {
        price: '$53,000',
        engine: '3.0L Twin-Scroll Turbo I6',
        horsepower: '382 hp',
        torque: '368 lb-ft',
        acceleration: '4.1s (0-60 mph)',
        topSpeed: '155 mph',
        weight: '3,397 lbs',
        transmission: '8-Speed Auto',
        driveType: 'Rear-Wheel Drive',
        fuelEconomy: '25 mpg combined',
        seating: '2'
      },
      pros: ['Excellent handling', 'Great value', 'Modern tech', 'Reliable'],
      cons: ['Limited cargo space', 'Artificial steering feel', 'Backseat? What backseat?']
    },
    {
      id: 2,
      make: 'Ford',
      model: 'Mustang GT',
      year: '2024',
      imageColor: 'from-blue-600 to-cyan-600',
      specs: {
        price: '$42,000',
        engine: '5.0L Coyote V8',
        horsepower: '480 hp',
        torque: '415 lb-ft',
        acceleration: '4.2s (0-60 mph)',
        topSpeed: '155 mph',
        weight: '3,705 lbs',
        transmission: '6-Speed Manual',
        driveType: 'Rear-Wheel Drive',
        fuelEconomy: '19 mpg combined',
        seating: '4'
      },
      pros: ['V8 soundtrack', 'Manual transmission', 'More practical', 'American muscle'],
      cons: ['Worse fuel economy', 'Heavier', 'Interior quality', 'Less precise handling']
    },
    {
      id: 3,
      make: 'Porsche',
      model: '911 Carrera',
      year: '2024',
      imageColor: 'from-gray-600 to-zinc-600',
      specs: {
        price: '$113,000',
        engine: '3.0L Twin-Turbo Flat-6',
        horsepower: '379 hp',
        torque: '331 lb-ft',
        acceleration: '4.0s (0-60 mph)',
        topSpeed: '182 mph',
        weight: '3,298 lbs',
        transmission: '8-Speed PDK',
        driveType: 'Rear-Wheel Drive',
        fuelEconomy: '22 mpg combined',
        seating: '2+2'
      },
      pros: ['Superb handling', 'High-quality interior', 'Porsche heritage', 'Daily drivable'],
      cons: ['Very expensive', 'Limited rear seats', 'Costly maintenance', 'Less power for price']
    },
    {
      id: 4,
      make: 'Tesla',
      model: 'Model 3 Performance',
      year: '2024',
      imageColor: 'from-green-600 to-emerald-600',
      specs: {
        price: '$53,000',
        engine: 'Dual Motor AWD',
        horsepower: '510 hp',
        torque: '547 lb-ft',
        acceleration: '3.1s (0-60 mph)',
        topSpeed: '162 mph',
        weight: '4,065 lbs',
        transmission: 'Single-Speed',
        driveType: 'All-Wheel Drive',
        fuelEconomy: '130 MPGe',
        seating: '5'
      },
      pros: ['Instant torque', 'Low operating costs', 'High tech', 'Practical'],
      cons: ['Battery degradation', 'Charging infrastructure', 'Build quality', 'No engine sound']
    }
  ]

  const specificationCategories = [
    { label: 'Price', key: 'price' },
    { label: 'Engine', key: 'engine' },
    { label: 'Horsepower', key: 'horsepower' },
    { label: 'Torque', key: 'torque' },
    { label: '0-60 mph', key: 'acceleration' },
    { label: 'Top Speed', key: 'topSpeed' },
    { label: 'Weight', key: 'weight' },
    { label: 'Transmission', key: 'transmission' },
    { label: 'Drive Type', key: 'driveType' },
    { label: 'Fuel Economy', key: 'fuelEconomy' },
    { label: 'Seating', key: 'seating' }
  ]

  const handleSelectCar = (carId) => {
    if (selectedCars.includes(carId)) {
      // Don't allow removing if only 2 cars left
      if (selectedCars.length > 2) {
        setSelectedCars(selectedCars.filter(id => id !== carId))
      }
    } else {
      // Don't allow selecting more than 4 cars
      if (selectedCars.length < 4) {
        setSelectedCars([...selectedCars, carId])
      }
    }
  }

  const selectedCarData = cars.filter(car => selectedCars.includes(car.id))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Compare Vehicles</h1>
        <p className="text-zinc-400">Side-by-side comparison to make informed decisions</p>
      </div>

      {/* Car Selection */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-bold mb-4">Select Vehicles to Compare</h3>
        <p className="text-zinc-400 mb-6">Choose 2-4 vehicles to compare side by side</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cars.map((car) => {
            const isSelected = selectedCars.includes(car.id)
            return (
              <div 
                key={car.id}
                onClick={() => handleSelectCar(car.id)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-red-500 bg-red-500 bg-opacity-10' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className={`h-32 bg-gradient-to-r ${car.imageColor} rounded-lg mb-4 flex items-center justify-center`}>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white opacity-90">{car.make.charAt(0)}</div>
                    <div className="text-white font-medium">{car.make}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{car.make} {car.model}</h4>
                    <p className="text-sm text-zinc-400">{car.year}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-zinc-600'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-800">
          <div className="text-zinc-400">
            Selected: <span className="text-white font-medium">{selectedCars.length}</span> of 4 vehicles
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => setSelectedCars([])}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white font-medium"
            >
              Clear All
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-lg text-white font-medium">
              Update Comparison
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      {selectedCarData.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-zinc-900 border border-zinc-800 p-4 text-left sticky left-0 z-10 min-w-[200px]">
                  <div className="font-bold text-lg">Specifications</div>
                </th>
                {selectedCarData.map((car) => (
                  <th key={car.id} className="bg-zinc-900 border border-zinc-800 p-4 min-w-[250px]">
                    <div className={`h-24 bg-gradient-to-r ${car.imageColor} rounded-lg mb-4 flex items-center justify-center`}>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white opacity-90">{car.make.charAt(0)}</div>
                        <div className="text-white font-medium">{car.make}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="text-xl font-bold">{car.make} {car.model}</h4>
                      <p className="text-zinc-400">{car.year}</p>
                      <div className="mt-2 text-2xl font-bold">{car.specs.price}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specificationCategories.map((category, index) => (
                <tr key={category.key} className={index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}>
                  <td className="border border-zinc-800 p-4 font-medium sticky left-0 z-10 bg-inherit">
                    {category.label}
                  </td>
                  {selectedCarData.map((car) => (
                    <td key={`${car.id}-${category.key}`} className="border border-zinc-800 p-4 text-center">
                      {car.specs[category.key]}
                    </td>
                  ))}
                </tr>
              ))}
              
              {/* Pros */}
              <tr className="bg-zinc-900">
                <td className="border border-zinc-800 p-4 font-medium sticky left-0 z-10 bg-inherit">
                  Pros
                </td>
                {selectedCarData.map((car) => (
                  <td key={`${car.id}-pros`} className="border border-zinc-800 p-4">
                    <ul className="space-y-2">
                      {car.pros.map((pro, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              
              {/* Cons */}
              <tr className="bg-zinc-950">
                <td className="border border-zinc-800 p-4 font-medium sticky left-0 z-10 bg-inherit">
                  Cons
                </td>
                {selectedCarData.map((car) => (
                  <td key={`${car.id}-cons`} className="border border-zinc-800 p-4">
                    <ul className="space-y-2">
                      {car.cons.map((con, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {selectedCarData.length >= 2 && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-2xl font-bold mb-4">Comparison Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-zinc-800 rounded-xl">
              <div className="text-3xl font-bold mb-2">Best Performance</div>
              <div className="text-lg font-medium mb-2">Tesla Model 3 Performance</div>
              <div className="text-zinc-400">0-60 mph in 3.1 seconds</div>
            </div>
            <div className="text-center p-6 bg-zinc-800 rounded-xl">
              <div className="text-3xl font-bold mb-2">Best Value</div>
              <div className="text-lg font-medium mb-2">Ford Mustang GT</div>
              <div className="text-zinc-400">$42,000 for 480 hp V8</div>
            </div>
            <div className="text-center p-6 bg-zinc-800 rounded-xl">
              <div className="text-3xl font-bold mb-2">Best Handling</div>
              <div className="text-lg font-medium mb-2">Porsche 911 Carrera</div>
              <div className="text-zinc-400">Precision and balance</div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Tips */}
      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">Comparison Tips</h3>
        <div className="grid grid-cols-1 md:grid-c-2 lg:grid-cols-3 gap-6">
          <div className="p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-bold mb-2">Consider Your Needs</h4>
            <p className="text-zinc-400">Think about daily use, passenger needs, cargo space, and intended driving style.</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-bold mb-2">Total Cost of Ownership</h4>
            <p className="text-zinc-400">Factor in insurance, maintenance, fuel, and depreciation, not just purchase price.</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-bold mb-2">Test Drive is Essential</h4>
            <p className="text-zinc-400">Specs tell part of the story. Always test drive to feel handling, comfort, and ergonomics.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComparePage
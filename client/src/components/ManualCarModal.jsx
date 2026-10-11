import { useState, useRef } from 'react'
import { authenticatedRequest } from '../services/api'

const bodyCategories = [
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'convertible', label: 'Convertible' },
  { value: 'truck', label: 'Truck / Pickup' },
  { value: 'electric', label: 'Electric (EV)' },
  { value: 'hybrid', label: 'Hybrid' },
]

const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'CNG', 'Plug-in Hybrid', 'Hybrid', 'LPG']
const transmissionTypes = ['Manual', 'Automatic', 'AMT', 'CVT', 'DCT / DSG', 'Single-Speed Reduction Gear']
const commonCurrencies = ['INR', 'USD', 'EUR', 'GBP']

const extractSpecs = (specifications = {}) => {
  const recognized = {
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    wheelbaseMm: '',
    groundClearanceMm: '',
    bootSpaceL: '',
    batteryCapacityKwh: '',
  }
  const custom = []

  for (const [key, rawValue] of Object.entries(specifications || {})) {
    const valStr = String(rawValue ?? '').trim()
    const lowerKey = key.toLowerCase()

    if (lowerKey === 'length') {
      recognized.lengthMm = valStr.replace(/[^0-9.]/g, '')
    } else if (lowerKey === 'width') {
      recognized.widthMm = valStr.replace(/[^0-9.]/g, '')
    } else if (lowerKey === 'height') {
      recognized.heightMm = valStr.replace(/[^0-9.]/g, '')
    } else if (lowerKey === 'wheelbase') {
      recognized.wheelbaseMm = valStr.replace(/[^0-9.]/g, '')
    } else if (lowerKey === 'ground clearance') {
      recognized.groundClearanceMm = valStr.replace(/[^0-9.]/g, '')
    } else if (lowerKey === 'boot space') {
      recognized.bootSpaceL = valStr.replace(/[^0-9.]/g, '')
    } else if (lowerKey === 'battery capacity') {
      recognized.batteryCapacityKwh = valStr.replace(/[^0-9.]/g, '')
    } else {
      custom.push({ key, value: valStr })
    }
  }

  return { recognized, custom }
}

export default function ManualCarModal({
  isOpen,
  onClose,
  onCarCreated,
  onCarUpdated,
  carToEdit = null,
  canUploadImage,
  getToken,
}) {
  const currentYear = new Date().getFullYear()
  const isEdit = Boolean(carToEdit)

  const initialSpecs = extractSpecs(carToEdit?.specifications)

  // Form state
  const [brand, setBrand] = useState(() => carToEdit?.brand || '')
  const [model, setModel] = useState(() => carToEdit?.model || '')
  const [launchYear, setLaunchYear] = useState(() => (carToEdit?.launchYear ? String(carToEdit.launchYear) : String(currentYear)))
  const [variant, setVariant] = useState(() => carToEdit?.variant || '')
  const [category, setCategory] = useState(() => carToEdit?.category || '')

  const [priceAmount, setPriceAmount] = useState(() => (carToEdit?.priceAmount != null ? String(carToEdit.priceAmount) : ''))
  const [priceCurrency, setPriceCurrency] = useState(() => carToEdit?.priceCurrency || 'INR')

  const [fuelType, setFuelType] = useState(() => carToEdit?.fuelType || '')
  const [transmission, setTransmission] = useState(() => carToEdit?.transmission || '')
  const [seatingCapacity, setSeatingCapacity] = useState(() => (carToEdit?.seatingCapacity != null ? String(carToEdit.seatingCapacity) : ''))

  const [engine, setEngine] = useState(() => carToEdit?.engine || '')
  const [horsepower, setHorsepower] = useState(() => (carToEdit?.horsepower != null ? String(carToEdit.horsepower) : ''))
  const [horsepowerUnit, setHorsepowerUnit] = useState(() => carToEdit?.horsepowerUnit || 'bhp')
  const [torque, setTorque] = useState(() => (carToEdit?.torque != null ? String(carToEdit.torque) : ''))
  const [torqueUnit, setTorqueUnit] = useState(() => carToEdit?.torqueUnit || 'Nm')
  const [mileage, setMileage] = useState(() => (carToEdit?.mileage != null ? String(carToEdit.mileage) : ''))
  const [mileageUnit, setMileageUnit] = useState(() => carToEdit?.mileageUnit || 'kmpl')

  // Common dimensions
  const [lengthMm, setLengthMm] = useState(() => initialSpecs.recognized.lengthMm)
  const [widthMm, setWidthMm] = useState(() => initialSpecs.recognized.widthMm)
  const [heightMm, setHeightMm] = useState(() => initialSpecs.recognized.heightMm)
  const [wheelbaseMm, setWheelbaseMm] = useState(() => initialSpecs.recognized.wheelbaseMm)
  const [groundClearanceMm, setGroundClearanceMm] = useState(() => initialSpecs.recognized.groundClearanceMm)
  const [bootSpaceL, setBootSpaceL] = useState(() => initialSpecs.recognized.bootSpaceL)
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(() => initialSpecs.recognized.batteryCapacityKwh)

  // Extra dynamic specifications
  const [customSpecs, setCustomSpecs] = useState(() => initialSpecs.custom)
  const [newSpecKey, setNewSpecKey] = useState('')
  const [newSpecVal, setNewSpecVal] = useState('')

  // Media
  const [imageUrl, setImageUrl] = useState(() => carToEdit?.images?.[0]?.url || '')
  const [imageAlt, setImageAlt] = useState(() => carToEdit?.images?.[0]?.alt || '')
  const [imageAttribution, setImageAttribution] = useState(() => carToEdit?.images?.[0]?.attribution || 'Manufacturer / Official Press')
  const [imageLicense, setImageLicense] = useState(() => carToEdit?.images?.[0]?.license || 'Verified press release / official site')

  // Source & Attribution
  const [sourceUrl, setSourceUrl] = useState(() => carToEdit?.sourceUrl || '')
  const [sourceTitle, setSourceTitle] = useState(() => carToEdit?.sourceTitle || '')
  const [sourceName, setSourceName] = useState(() => carToEdit?.sourceName || (isEdit ? '' : 'Manual Admin Entry'))
  const [notes, setNotes] = useState(() => carToEdit?.reviewNotes || carToEdit?.notes || '')

  // Status & loading
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('essential') // 'essential' | 'specs' | 'media'

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  // Cloudinary image upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await authenticatedRequest(
        getToken,
        'POST',
        '/car-catalog/upload-image',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      if (response.data?.url) {
        setImageUrl(response.data.url)
        if (!imageAlt && (brand || model)) {
          setImageAlt(`${brand} ${model} ${variant}`.trim())
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image. You can paste an image URL instead.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddCustomSpec = (e) => {
    e.preventDefault()
    if (!newSpecKey.trim() || !newSpecVal.trim()) return
    setCustomSpecs((prev) => [...prev, { key: newSpecKey.trim(), value: newSpecVal.trim() }])
    setNewSpecKey('')
    setNewSpecVal('')
  }

  const handleRemoveCustomSpec = (index) => {
    setCustomSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (publishImmediately) => {
    setError('')

    // Client-side validation
    if (!brand.trim()) {
      setError('Brand is required (e.g. Tata, Hyundai, Maruti Suzuki).')
      setActiveTab('essential')
      return
    }
    if (!model.trim()) {
      setError('Model is required (e.g. Nexon, Creta, Swift).')
      setActiveTab('essential')
      return
    }
    const yearNum = Number(launchYear)
    if (!Number.isInteger(yearNum) || yearNum < 1886 || yearNum > currentYear + 2) {
      setError(`Model year must be a valid year between 1886 and ${currentYear + 2}.`)
      setActiveTab('essential')
      return
    }

    if (publishImmediately && !category) {
      setError('A valid Body Category is required to publish immediately to the public catalogue.')
      setActiveTab('essential')
      return
    }

    // Build specifications dictionary
    const specsMap = {}
    if (lengthMm.trim()) specsMap['Length'] = `${lengthMm.trim()} mm`
    if (widthMm.trim()) specsMap['Width'] = `${widthMm.trim()} mm`
    if (heightMm.trim()) specsMap['Height'] = `${heightMm.trim()} mm`
    if (wheelbaseMm.trim()) specsMap['Wheelbase'] = `${wheelbaseMm.trim()} mm`
    if (groundClearanceMm.trim()) specsMap['Ground Clearance'] = `${groundClearanceMm.trim()} mm`
    if (bootSpaceL.trim()) specsMap['Boot Space'] = `${bootSpaceL.trim()} litres`
    if (batteryCapacityKwh.trim()) specsMap['Battery Capacity'] = `${batteryCapacityKwh.trim()} kWh`

    customSpecs.forEach(({ key, value }) => {
      if (key && value) specsMap[key] = value
    })

    const payload = {
      brand: brand.trim(),
      model: model.trim(),
      variant: variant.trim(),
      launchYear: yearNum,
      category: category || null,
      priceAmount: priceAmount === '' ? null : Number(priceAmount),
      priceCurrency: priceAmount === '' ? '' : (priceCurrency || 'INR'),
      fuelType: fuelType.trim(),
      transmission: transmission.trim(),
      seatingCapacity: seatingCapacity === '' ? null : Number(seatingCapacity),
      engine: engine.trim(),
      horsepower: horsepower === '' ? null : Number(horsepower),
      horsepowerUnit: horsepower === '' ? '' : horsepowerUnit,
      torque: torque === '' ? null : Number(torque),
      torqueUnit: torque === '' ? '' : torqueUnit,
      mileage: mileage === '' ? null : Number(mileage),
      mileageUnit: mileage === '' ? '' : mileageUnit,
      specifications: specsMap,
      imageUrl: imageUrl.trim(),
      imageAlt: imageAlt.trim() || `${brand.trim()} ${model.trim()}`,
      imageAttribution: imageAttribution.trim(),
      imageLicense: imageLicense.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      sourceTitle: sourceTitle.trim() || undefined,
      sourceName: sourceName.trim() || undefined,
      notes: notes.trim(),
      publishNow: publishImmediately,
    }

    setSubmitting(true)

    try {
      if (isEdit) {
        const response = await authenticatedRequest(
          getToken,
          'PATCH',
          `/car-catalog/review/${carToEdit._id}`,
          payload
        )
        if (onCarUpdated) {
          onCarUpdated(response.data?.car)
        }
      } else {
        const response = await authenticatedRequest(
          getToken,
          'POST',
          '/car-catalog/review/manual',
          payload
        )
        if (onCarCreated) {
          onCarCreated(response.data?.car, publishImmediately)
        }
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save car. Please check the entered fields.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative my-8 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-950 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-800/60">
                Admin Console
              </span>
              <h2 className="text-xl font-black text-white">
                {isEdit ? `Update Vehicle: ${brand || carToEdit.brand} ${model || carToEdit.model}` : 'Manual Car Entry'}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isEdit
                ? `Update specifications, pricing, imagery, or status for this vehicle record.`
                : 'Directly input car details without AI ingestion. Unknown specs stay safely stored as null.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('essential')}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'essential'
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. Core Details &amp; Powertrain
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'specs'
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. Dimensions &amp; Specifications
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'media'
                ? 'border-red-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3. Media &amp; Source Attribution
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              <strong className="font-semibold">Error: </strong> {error}
            </div>
          )}

          {/* TAB 1: Core Details & Powertrain */}
          {activeTab === 'essential' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Identification</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">
                      Brand <span className="text-red-400">*</span>
                    </span>
                    <input
                      required
                      type="text"
                      maxLength={80}
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Tata, Hyundai, Porsche"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">
                      Model <span className="text-red-400">*</span>
                    </span>
                    <input
                      required
                      type="text"
                      maxLength={100}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. Nexon EV, Creta, 911"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">
                      Model Year <span className="text-red-400">*</span>
                    </span>
                    <input
                      required
                      type="number"
                      min={1886}
                      max={currentYear + 2}
                      value={launchYear}
                      onChange={(e) => setLaunchYear(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Variant</span>
                    <input
                      type="text"
                      maxLength={120}
                      value={variant}
                      onChange={(e) => setVariant(e.target.value)}
                      placeholder="e.g. Empowered Plus, Turbo ZXi"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>
                </div>
              </div>

              {/* Classification & Pricing */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Classification &amp; Pricing</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">
                      Body Category <span className="text-zinc-500">(Required for immediate publish)</span>
                    </span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    >
                      <option value="">Select category...</option>
                      {bodyCategories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Ex-showroom Price</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      placeholder="e.g. 1449000"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Currency</span>
                    <select
                      value={priceCurrency}
                      onChange={(e) => setPriceCurrency(e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    >
                      {commonCurrencies.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Powertrain & Transmission */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Powertrain &amp; Specs</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Fuel Type</span>
                    <input
                      type="text"
                      list="fuel-types-list"
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      placeholder="e.g. Petrol, Electric, Diesel"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                    <datalist id="fuel-types-list">
                      {fuelTypes.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Transmission</span>
                    <input
                      type="text"
                      list="transmission-types-list"
                      value={transmission}
                      onChange={(e) => setTransmission(e.target.value)}
                      placeholder="e.g. 6-Speed Manual, 7-Speed DCT"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                    <datalist id="transmission-types-list">
                      {transmissionTypes.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Seating Capacity</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={seatingCapacity}
                      onChange={(e) => setSeatingCapacity(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block sm:col-span-2 lg:col-span-3">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Engine Details</span>
                    <input
                      type="text"
                      maxLength={160}
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      placeholder="e.g. 1.2L Revotron 3-cylinder Turbo Petrol (1199 cc)"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  {/* Power */}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Horsepower / Power</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={horsepower}
                        onChange={(e) => setHorsepower(e.target.value)}
                        placeholder="e.g. 120"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="w-24">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Unit</span>
                      <select
                        value={horsepowerUnit}
                        onChange={(e) => setHorsepowerUnit(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white outline-none focus:border-red-500"
                      >
                        <option value="bhp">bhp</option>
                        <option value="ps">ps</option>
                        <option value="hp">hp</option>
                        <option value="kW">kW</option>
                      </select>
                    </label>
                  </div>

                  {/* Torque */}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Torque</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={torque}
                        onChange={(e) => setTorque(e.target.value)}
                        placeholder="e.g. 170"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="w-24">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Unit</span>
                      <select
                        value={torqueUnit}
                        onChange={(e) => setTorqueUnit(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white outline-none focus:border-red-500"
                      >
                        <option value="Nm">Nm</option>
                        <option value="kgm">kgm</option>
                      </select>
                    </label>
                  </div>

                  {/* Mileage / Range */}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Mileage / Range</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        placeholder="e.g. 17.5 or 465"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="w-28">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Unit</span>
                      <select
                        value={mileageUnit}
                        onChange={(e) => setMileageUnit(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white outline-none focus:border-red-500"
                      >
                        <option value="kmpl">kmpl</option>
                        <option value="km">km (range)</option>
                        <option value="km/kg">km/kg (CNG)</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Dimensions & Specifications */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Dimensions &amp; Capacities</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Fill in standard vehicle dimensions or leave empty if unknown.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Length (mm)</span>
                    <input
                      type="number"
                      min={0}
                      value={lengthMm}
                      onChange={(e) => setLengthMm(e.target.value)}
                      placeholder="e.g. 3995"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Width (mm)</span>
                    <input
                      type="number"
                      min={0}
                      value={widthMm}
                      onChange={(e) => setWidthMm(e.target.value)}
                      placeholder="e.g. 1804"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Height (mm)</span>
                    <input
                      type="number"
                      min={0}
                      value={heightMm}
                      onChange={(e) => setHeightMm(e.target.value)}
                      placeholder="e.g. 1620"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Wheelbase (mm)</span>
                    <input
                      type="number"
                      min={0}
                      value={wheelbaseMm}
                      onChange={(e) => setWheelbaseMm(e.target.value)}
                      placeholder="e.g. 2498"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Ground Clearance (mm)</span>
                    <input
                      type="number"
                      min={0}
                      value={groundClearanceMm}
                      onChange={(e) => setGroundClearanceMm(e.target.value)}
                      placeholder="e.g. 208"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Boot Space (litres)</span>
                    <input
                      type="number"
                      min={0}
                      value={bootSpaceL}
                      onChange={(e) => setBootSpaceL(e.target.value)}
                      placeholder="e.g. 382"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Battery Capacity (kWh) - EV</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={batteryCapacityKwh}
                      onChange={(e) => setBatteryCapacityKwh(e.target.value)}
                      placeholder="e.g. 40.5 (for EVs)"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>
                </div>
              </div>

              {/* Custom Key-Value Specifications */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <h4 className="text-sm font-bold text-zinc-200">Additional Custom Specifications</h4>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Add any other facts (e.g., &quot;Airbags&quot;: &quot;6 Standard&quot;, &quot;Touchscreen&quot;: &quot;10.25 inch&quot;, &quot;Kerb Weight&quot;: &quot;1250 kg&quot;).
                </p>

                {customSpecs.length > 0 && (
                  <div className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900">
                    {customSpecs.map((spec, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div>
                          <strong className="text-zinc-300">{spec.key}: </strong>
                          <span className="text-zinc-400">{spec.value}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSpec(index)}
                          className="font-bold text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Specification name (e.g. Fuel Tank)"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 44 Litres)"
                    value={newSpecVal}
                    onChange={(e) => setNewSpecVal(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpec}
                    className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                  >
                    + Add Spec
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Media & Source Attribution */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Image upload / URL */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Car Imagery</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {canUploadImage
                    ? 'Upload an image directly via Cloudinary, or paste a publicly accessible HTTPS image URL.'
                    : 'Cloudinary is not configured. Provide an HTTPS image URL from official press or manufacturer sites.'}
                </p>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {canUploadImage && (
                    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-4 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="car-image-file-input"
                        disabled={uploadingImage}
                      />
                      <label
                        htmlFor="car-image-file-input"
                        className="inline-block cursor-pointer rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-zinc-700 disabled:opacity-50"
                      >
                        {uploadingImage ? 'Uploading to Cloudinary...' : '📁 Choose Image File'}
                      </label>
                      <p className="mt-2 text-[11px] text-zinc-500">JPG, PNG, WebP or AVIF (up to 10MB)</p>
                    </div>
                  )}

                  <div className={canUploadImage ? '' : 'sm:col-span-2'}>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-zinc-300">Image URL</span>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.example.com/car.jpg"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                      />
                    </label>
                  </div>
                </div>

                {imageUrl && (
                  <div className="mt-4 flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <img
                      src={imageUrl}
                      alt={imageAlt || 'Car preview'}
                      className="aspect-video h-20 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setError('Image URL could not be loaded. Please verify the URL is valid.')}
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-white">Preview ready</p>
                      <p className="mt-0.5 truncate text-zinc-400">{imageUrl}</p>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="mt-1 font-bold text-red-400 hover:text-red-300"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Image Alt Text</span>
                    <input
                      type="text"
                      maxLength={200}
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder={`e.g. ${brand || 'Make'} ${model || 'Model'} front quarter angle`}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Image Attribution / Credit</span>
                    <input
                      type="text"
                      maxLength={200}
                      value={imageAttribution}
                      onChange={(e) => setImageAttribution(e.target.value)}
                      placeholder="e.g. Tata Motors Press Pack / Official Website"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Image License / Terms</span>
                    <input
                      type="text"
                      maxLength={200}
                      value={imageLicense}
                      onChange={(e) => setImageLicense(e.target.value)}
                      placeholder="e.g. Official press kit / editorial use"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>
                </div>
              </div>

              {/* Source & Provenance */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Source &amp; Provenance</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Provide links to official brochures or automotive publications corroborating this vehicle data.
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Source URL / Brochure Link</span>
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://www.tatamotors.com/brochures/..."
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Source Publication Name</span>
                    <input
                      type="text"
                      maxLength={120}
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="e.g. Tata Motors Official / Autocar India"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Source Document / Page Title</span>
                    <input
                      type="text"
                      maxLength={200}
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      placeholder="e.g. Tata Nexon EV Technical Brochure 2025"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-zinc-300">Internal Admin Notes</span>
                    <input
                      type="text"
                      maxLength={1000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Verified against official 2025 PDF brochure; starting base price"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white outline-none focus:border-red-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              Identity key: <code className="text-zinc-300 font-mono text-[11px]">{brand && model ? `${brand.toLowerCase()}|${model.toLowerCase()}|${variant ? variant.toLowerCase() : ''}|${launchYear}` : 'brand|model|variant|year'}</code>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting || uploadingImage}
              onClick={() => handleSubmit(false)}
              className="rounded-xl border border-amber-800 bg-amber-950/60 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-900 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit ? '💾 Save Changes' : '💾 Save as Pending Review'}
            </button>

            <button
              type="button"
              disabled={submitting || uploadingImage}
              onClick={() => handleSubmit(true)}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit && carToEdit?.reviewStatus === 'approved' ? '🚀 Save & Update Live' : '🚀 Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import Car from '../models/Car.js';
import { isCatalogAdmin } from '../middleware/catalogAdmin.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';

const categories = new Set(['sedan', 'suv', 'hatchback', 'truck', 'coupe', 'convertible', 'electric', 'hybrid']);
const errorWithStatus = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const allowedDomains = () => new Set(
  (process.env.CAR_SOURCE_ALLOWED_DOMAINS || '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean),
);
const isApprovedSourceUrl = (value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  const domains = allowedDomains();
  const sensitiveQueryFragments = ['key', 'token', 'auth', 'signature', 'secret', 'password'];
  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && domains.has(hostname)
    && ![...url.searchParams.keys()].some((key) => sensitiveQueryFragments.some((fragment) => key.toLowerCase().includes(fragment)));
};

export const listCatalogCars = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
    const query = String(req.query.search || '').trim().slice(0, 100);
    // Public catalog: approved records only. Pending/rejected data never leaves the admin console.
    const filter = { reviewStatus: 'approved' };

    if (query) {
      const safeQuery = new RegExp(escaped(query), 'i');
      filter.$or = [{ brand: safeQuery }, { model: safeQuery }, { variant: safeQuery }];
    }
    if (req.query.category) {
      const category = String(req.query.category).toLowerCase();
      if (!categories.has(category)) throw errorWithStatus('Choose a valid car category.');
      filter.category = category;
    }
    if (req.query.fuelType) filter.fuelType = new RegExp(escaped(String(req.query.fuelType).slice(0, 40)), 'i');
    if (req.query.transmission) filter.transmission = new RegExp(escaped(String(req.query.transmission).slice(0, 40)), 'i');
    if (req.query.minPrice || req.query.maxPrice) {
      filter.priceAmount = {};
      if (req.query.minPrice) filter.priceAmount.$gte = Math.max(0, Number(req.query.minPrice));
      if (req.query.maxPrice) filter.priceAmount.$lte = Math.max(0, Number(req.query.maxPrice));
      if (Object.values(filter.priceAmount).some((value) => !Number.isFinite(value))) {
        throw errorWithStatus('Price filters must be valid numbers.');
      }
    }

    const [cars, total] = await Promise.all([
      Car.find(filter).sort({ launchYear: -1, brand: 1, model: 1, variant: 1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Car.countDocuments(filter),
    ]);
    res.json({ success: true, cars, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

export const getCatalogCar = async (req, res, next) => {
  try {
    const car = await Car.findOne({ _id: req.params.carId, reviewStatus: 'approved' }).lean();
    if (!car) throw errorWithStatus('Car not found.', 404);
    const variants = await Car.find({
      brand: car.brand,
      model: car.model,
      launchYear: car.launchYear,
      reviewStatus: 'approved',
    }).sort({ variant: 1 }).lean();
    res.json({ success: true, car, variants });
  } catch (error) {
    if (error.name === 'CastError') return next(errorWithStatus('Car not found.', 404));
    return next(error);
  }
};

export const compareCatalogCars = async (req, res, next) => {
  try {
    let rawIds = [];
    if (req.query.ids) {
      rawIds = String(req.query.ids).split(',').map((id) => id.trim()).filter(Boolean);
    } else if (req.query.id) {
      rawIds = Array.isArray(req.query.id) ? req.query.id : [req.query.id];
    }

    const validIds = rawIds.filter((id) => mongoose.isValidObjectId(id));
    if (!validIds.length) {
      return res.json({ success: true, cars: [] });
    }

    // Maximum 4 cars can be compared side-by-side
    const queryIds = validIds.slice(0, 4);
    const cars = await Car.find({
      _id: { $in: queryIds },
      reviewStatus: 'approved',
    }).lean();

    // Preserve the requested order
    const orderMap = new Map(queryIds.map((id, index) => [String(id), index]));
    cars.sort((a, b) => (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0));

    res.json({ success: true, cars });
  } catch (error) {
    next(error);
  }
};

export const getCatalogPermissions = (req, res) => {
  res.json({ success: true, isAdmin: isCatalogAdmin(req), canUploadImage: isCloudinaryConfigured() });
};

export const agentRequest = async (path, { method = 'GET', body, timeoutMs = 10000 } = {}) => {
  const agentUrl = process.env.CAR_INGESTION_AGENT_URL || 'http://127.0.0.1:8010';
  const secret = process.env.CAR_INGESTION_SHARED_SECRET;
  if (!agentUrl || !secret) throw errorWithStatus('The ingestion agent is not configured.', 503);
  let response;
  try {
    response = await fetch(`${agentUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: { Authorization: `Bearer ${secret}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw errorWithStatus('The ingestion agent is unreachable. Start the Python service and try again.', 502);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.detail === 'string' ? result.detail : result.message;
    throw errorWithStatus(detail || 'The ingestion agent rejected the request.', response.status === 401 ? 502 : response.status);
  }
  return result;
};

export const getIngestionStatus = async (_req, res, next) => {
  try {
    if (!process.env.CAR_INGESTION_SHARED_SECRET) {
      return res.json({ success: true, configured: false, status: 'not_configured' });
    }
    try {
      const status = await agentRequest('/ingest/status', { timeoutMs: 5000 });
      return res.json({ success: true, reachable: true, ...status });
    } catch (error) {
      if (error.statusCode === 502) return res.json({ success: true, configured: false, reachable: false, status: 'unreachable' });
      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

const MAX_INGEST_BATCH = 25;

export const triggerIngestion = async (req, res, next) => {
  try {
    const count = Number(req.body?.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_INGEST_BATCH) {
      throw errorWithStatus(`Choose between 1 and ${MAX_INGEST_BATCH} cars to ingest.`);
    }
    // The acting admin comes from the verified Clerk session, never from the client payload.
    const { userId } = getAuth(req);
    const result = await agentRequest('/ingest', { method: 'POST', body: { count, requestedBy: userId }, timeoutMs: 15000 });
    return res.status(202).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};

const normalizeIdentity = (record) => [
  record.brand,
  record.model,
  record.variant || '',
  record.launchYear,
].map((part) => String(part).trim().toLowerCase().replace(/\s+/g, '-')).join('|');

const validateRecord = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw errorWithStatus('Each car record must be a JSON object.');
  }
  const brand = String(record.brand || '').trim();
  const model = String(record.model || '').trim();
  const variant = String(record.variant || '').trim();
  const category = String(record.category || '').toLowerCase();
  const sourceName = String(record.sourceName || '').trim();
  const sourceLicense = String(record.sourceLicense || '').trim();
  const sourceUrl = String(record.sourceUrl || '').trim();
  const launchYear = Number(record.launchYear);

  if (!brand || brand.length > 80 || !model || model.length > 100 || variant.length > 120) {
    throw errorWithStatus('Each car requires a valid brand and model; variant must be 120 characters or fewer.');
  }
  if (!Number.isInteger(launchYear) || launchYear < 1886 || launchYear > new Date().getFullYear() + 2) {
    throw errorWithStatus('Car launch year is invalid.');
  }
  if (!categories.has(category)) throw errorWithStatus('Each car must use a supported vehicle category.');
  if (!sourceName || sourceName.length > 120 || !sourceLicense || sourceLicense.length > 300 || sourceUrl.length > 2000 || !isApprovedSourceUrl(sourceUrl)) {
    throw errorWithStatus('Each car requires source attribution and licensing information.');
  }

  const images = Array.isArray(record.images) ? record.images.slice(0, 12).map((image) => {
    if (!image || typeof image !== 'object' || Array.isArray(image)) {
      throw errorWithStatus('Each car image must be a JSON object.');
    }
    return {
      url: String(image.url || ''),
      alt: String(image.alt || '').slice(0, 200),
      sourceUrl: String(image.sourceUrl || sourceUrl),
      license: String(image.license || sourceLicense).slice(0, 200),
    };
  }) : [];
  if (images.some((image) => !isApprovedSourceUrl(image.url) || !isApprovedSourceUrl(image.sourceUrl) || !image.license)) {
    throw errorWithStatus('Car images must use approved HTTPS sources with license attribution.');
  }

  const optionalNumber = (value, field, { integer = false, min = 0 } = {}) => {
    if (value == null) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || (integer && !Number.isInteger(number))) {
      throw errorWithStatus(`${field} must be a valid ${integer ? 'integer' : 'number'} of at least ${min}.`);
    }
    return number;
  };
  const priceCurrency = String(record.priceCurrency || '').toUpperCase();
  if (priceCurrency && !/^[A-Z]{3}$/.test(priceCurrency)) {
    throw errorWithStatus('Price currency must be a three-letter ISO currency code.');
  }
  if (priceCurrency && priceCurrency !== 'INR') {
    throw errorWithStatus('The India car catalog accepts prices only when the source specifies INR.');
  }
  if (record.priceAmount != null && !priceCurrency) {
    throw errorWithStatus('Price currency is required when a price is provided.');
  }
  const sourceLicenseUrl = String(record.sourceLicenseUrl || '');
  if (sourceLicenseUrl && (!URL.canParse(sourceLicenseUrl) || new URL(sourceLicenseUrl).protocol !== 'https:')) {
    throw errorWithStatus('Source license URL must use HTTPS.');
  }

  return {
    brand,
    model,
    variant,
    category,
    launchYear,
    priceAmount: optionalNumber(record.priceAmount, 'Price'),
    priceCurrency,
    engine: String(record.engine || '').slice(0, 160),
    horsepower: optionalNumber(record.horsepower, 'Horsepower'),
    horsepowerUnit: String(record.horsepowerUnit || '').slice(0, 12),
    torque: optionalNumber(record.torque, 'Torque'),
    torqueUnit: String(record.torqueUnit || '').slice(0, 12),
    mileage: optionalNumber(record.mileage, 'Mileage'),
    mileageUnit: String(record.mileageUnit || '').slice(0, 20),
    fuelType: String(record.fuelType || '').slice(0, 40),
    transmission: String(record.transmission || '').slice(0, 40),
    seatingCapacity: optionalNumber(record.seatingCapacity, 'Seating capacity', { integer: true, min: 1 }),
    specifications: Object.fromEntries(
      Object.entries(
        record.specifications && typeof record.specifications === 'object' && !Array.isArray(record.specifications)
          ? record.specifications
          : {},
      ).slice(0, 40)
        .map(([key, value]) => [String(key).slice(0, 80), String(value).slice(0, 300)]),
    ),
    images,
    sourceUrl,
    sourceTitle: String(record.sourceTitle || '').trim().slice(0, 300),
    sourceName,
    sourceLicense,
    sourceLicenseUrl,
    fieldSources: Object.fromEntries(
      Object.entries(
        record.fieldSources && typeof record.fieldSources === 'object' && !Array.isArray(record.fieldSources)
          ? record.fieldSources
          : {},
      ).slice(0, 60).map(([field, provenance]) => {
        if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
          throw errorWithStatus(`Source evidence for ${field} is invalid.`);
        }
        const provenanceUrl = String(provenance.sourceUrl || '');
        const quote = String(provenance.quote || '').trim();
        if (!isApprovedSourceUrl(provenanceUrl) || !quote || quote.length > 1000) {
          throw errorWithStatus(`Source evidence for ${field} requires an approved source URL and supporting quote.`);
        }
        return [field, {
          sourceTitle: String(provenance.sourceTitle || '').slice(0, 300),
          sourceUrl: provenanceUrl,
          sourceName: String(provenance.sourceName || '').slice(0, 120),
          quote,
        }];
      }),
    ),
    sourceVerifiedAt: new Date(),
    ingestionUpdatedAt: new Date(),
    identityKey: normalizeIdentity({ brand, model, variant, launchYear }),
  };
};

export const ingestCatalogCars = async (req, res, next) => {
  try {
    const records = req.body?.cars;
    if (!Array.isArray(records) || records.length < 1 || records.length > 100) {
      throw errorWithStatus('Submit between 1 and 100 cars per ingestion request.');
    }

    const carsByIdentity = new Map(records.map((record) => {
      const car = validateRecord(record);
      return [car.identityKey, car];
    }));
    const cars = [...carsByIdentity.values()];
    const result = await Car.bulkWrite(cars.map((car) => ({
      updateOne: {
        filter: { identityKey: car.identityKey },
        update: { $set: car },
        upsert: true,
      },
    })), { ordered: true });
    const newByCategory = {};
    for (const index of Object.keys(result.upsertedIds || {})) {
      const category = cars[Number(index)]?.category;
      if (category) newByCategory[category] = (newByCategory[category] || 0) + 1;
    }

    res.status(200).json({
      success: true,
      received: records.length,
      unique: cars.length,
      inserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      newByCategory,
    });
  } catch (error) {
    next(error);
  }
};

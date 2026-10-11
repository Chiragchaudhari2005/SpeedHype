import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import Car from '../models/Car.js';
import IngestionRun from '../models/IngestionRun.js';
import { agentRequest } from './carCatalogController.js';
import { isCloudinaryConfigured, uploadCarImage } from '../config/cloudinary.js';

const categories = new Set(['sedan', 'suv', 'hatchback', 'truck', 'coupe', 'convertible', 'electric', 'hybrid']);
const errorWithStatus = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const validId = (id) => mongoose.isValidObjectId(id);
const reviewerId = (req) => {
  let userId = req.auth?.userId;
  if (!userId) {
    try {
      const auth = getAuth(req);
      userId = auth?.userId;
    } catch {
      userId = null;
    }
  }
  if (!userId) throw errorWithStatus('Authentication is required.', 401);
  return userId; // always taken from the verified Clerk session, never from the request body
};

export const listIngestionRuns = async (_req, res, next) => {
  try {
    const runs = await IngestionRun.find().select('-logs').sort({ startedAt: -1 }).limit(20).lean();
    res.json({ success: true, runs });
  } catch (error) {
    next(error);
  }
};

export const getIngestionRun = async (req, res, next) => {
  try {
    if (!validId(req.params.runId)) throw errorWithStatus('Ingestion run not found.', 404);
    const run = await IngestionRun.findById(req.params.runId).lean();
    if (!run) throw errorWithStatus('Ingestion run not found.', 404);
    res.json({ success: true, run });
  } catch (error) {
    next(error);
  }
};

export const listReviewCars = async (req, res, next) => {
  try {
    const status = String(req.query.status || 'pending');
    if (!['pending', 'approved', 'rejected'].includes(status)) throw errorWithStatus('Choose a valid review status.');
    const cars = await Car.find({ reviewStatus: status }).sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ success: true, cars });
  } catch (error) {
    next(error);
  }
};

export const getReviewCounts = async (_req, res, next) => {
  try {
    const rows = await Car.aggregate([{ $group: { _id: '$reviewStatus', count: { $sum: 1 } } }]);
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const row of rows) if (row._id in counts) counts[row._id] = row.count;
    res.json({ success: true, counts: { ...counts, published: counts.approved } });
  } catch (error) {
    next(error);
  }
};

const identityKeyFor = (car) => [car.brand, car.model, car.variant || '', car.launchYear]
  .map((part) => String(part).trim().toLowerCase().replace(/\s+/g, '-')).join('|');

const textFields = { variant: 120, engine: 160, fuelType: 40, transmission: 40, horsepowerUnit: 12, torqueUnit: 12, mileageUnit: 20 };
const numberFields = { priceAmount: { min: 0 }, horsepower: { min: 0 }, torque: { min: 0 }, mileage: { min: 0 }, seatingCapacity: { min: 1, integer: true } };

export const updateReviewCar = async (req, res, next) => {
  try {
    if (!validId(req.params.carId)) throw errorWithStatus('Car not found.', 404);
    const adminId = reviewerId(req);
    const car = await Car.findById(req.params.carId).lean();
    if (!car) throw errorWithStatus('Car not found.', 404);

    const body = req.body || {};
    const changes = {};

    // Basic identifiers
    if ('brand' in body) {
      const brand = String(body.brand || '').trim();
      if (!brand) throw errorWithStatus('Brand is required.');
      if (brand.length > 80) throw errorWithStatus('Brand must be 80 characters or fewer.');
      changes.brand = brand;
    }
    if ('model' in body) {
      const model = String(body.model || '').trim();
      if (!model) throw errorWithStatus('Model is required.');
      if (model.length > 100) throw errorWithStatus('Model must be 100 characters or fewer.');
      changes.model = model;
    }
    if ('variant' in body) {
      const variant = body.variant == null ? '' : String(body.variant).trim();
      if (variant.length > 120) throw errorWithStatus('Variant must be 120 characters or fewer.');
      changes.variant = variant;
    }
    if ('launchYear' in body) {
      const year = Number(body.launchYear);
      if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 2) throw errorWithStatus('Model year is invalid.');
      changes.launchYear = year;
    }

    // Text & mechanical fields
    for (const [field, max] of Object.entries(textFields)) {
      if (field === 'variant') continue;
      if (!(field in body)) continue;
      const value = body[field] == null ? '' : String(body[field]).trim();
      if (value.length > max) throw errorWithStatus(`${field} must be ${max} characters or fewer.`);
      changes[field] = value;
    }

    // Numbers & null preservation
    for (const [field, rule] of Object.entries(numberFields)) {
      if (!(field in body)) continue;
      if (body[field] === null || body[field] === '') { changes[field] = null; continue; }
      const number = Number(body[field]);
      if (!Number.isFinite(number) || number < rule.min || (rule.integer && !Number.isInteger(number))) {
        throw errorWithStatus(`${field} must be a valid ${rule.integer ? 'whole ' : ''}number of at least ${rule.min}, or empty.`);
      }
      changes[field] = number;
    }

    if ('priceCurrency' in body) {
      changes.priceCurrency = body.priceCurrency ? String(body.priceCurrency).trim().toUpperCase() : 'INR';
    } else if (changes.priceAmount != null && !car.priceCurrency) {
      changes.priceCurrency = 'INR';
    }

    if ('category' in body) {
      const category = body.category ? String(body.category).toLowerCase().trim() : null;
      if (category && !categories.has(category)) throw errorWithStatus('Choose a valid body category.');
      changes.category = category;
    }

    // Specifications map
    if ('specifications' in body && typeof body.specifications === 'object' && body.specifications !== null) {
      changes.specifications = body.specifications;
    }

    // Images
    if ('imageUrl' in body) {
      const url = String(body.imageUrl || '').trim();
      if (url) {
        changes.images = [{
          url,
          alt: String(body.imageAlt || `${changes.brand || car.brand} ${changes.model || car.model}`).trim().slice(0, 200),
          attribution: String(body.imageAttribution || 'Official manufacturer / press release').trim().slice(0, 200),
          license: String(body.imageLicense || 'Official press release').trim().slice(0, 200),
          permissionStatus: 'approved',
        }];
      } else {
        changes.images = [];
      }
    } else if ('images' in body && Array.isArray(body.images)) {
      changes.images = body.images;
    }

    // Source & attribution provenance
    if ('sourceUrl' in body && body.sourceUrl) changes.sourceUrl = String(body.sourceUrl).trim();
    if ('sourceName' in body && body.sourceName) changes.sourceName = String(body.sourceName).trim().slice(0, 120);
    if ('sourceTitle' in body) changes.sourceTitle = String(body.sourceTitle || '').trim().slice(0, 300);
    if ('reviewNotes' in body || 'notes' in body) {
      changes.reviewNotes = String(body.reviewNotes ?? body.notes ?? '').trim().slice(0, 1000);
    }

    // Immediate publish / review status transition
    if (body.publishNow === true) {
      const activeCategory = changes.category ?? car.category;
      if (!activeCategory || !categories.has(activeCategory)) {
        throw errorWithStatus('A valid body category is required to publish this vehicle.', 400);
      }
      changes.reviewStatus = 'approved';
      changes.reviewedBy = adminId;
      changes.reviewedAt = new Date();
    } else if (body.publishNow === false && car.reviewStatus === 'approved') {
      changes.reviewStatus = 'pending';
    }

    if (!Object.keys(changes).length) throw errorWithStatus('No editable fields were supplied.');

    // Deterministic identity key check if any identifying dimension changed
    const effectiveBrand = changes.brand || car.brand;
    const effectiveModel = changes.model || car.model;
    const effectiveVariant = 'variant' in changes ? changes.variant : car.variant;
    const effectiveYear = changes.launchYear || car.launchYear;

    const newIdentityKey = identityKeyFor({
      brand: effectiveBrand,
      model: effectiveModel,
      variant: effectiveVariant,
      launchYear: effectiveYear,
    });

    if (newIdentityKey !== car.identityKey) {
      const duplicate = await Car.findOne({ identityKey: newIdentityKey, _id: { $ne: car._id } }).lean();
      if (duplicate) {
        throw errorWithStatus(`Another vehicle already exists with identity "${effectiveBrand} ${effectiveModel} (${effectiveVariant}) ${effectiveYear}".`, 409);
      }
      changes.identityKey = newIdentityKey;
    }

    const editedFields = [...new Set([...(car.editedFields || []), ...Object.keys(changes)])];
    changes.editedBy = adminId;
    changes.editedAt = new Date();
    changes.editedFields = editedFields;

    const updated = await Car.findByIdAndUpdate(
      car._id,
      { $set: changes },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) throw errorWithStatus('Car could not be updated.', 404);

    res.json({
      success: true,
      car: updated,
      message: `${updated.brand} ${updated.model} updated successfully.`,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorWithStatus('Another record already exists with this brand, model, variant and year.', 409));
    }
    next(error);
  }
};

export const retryReviewCar = async (req, res, next) => {
  try {
    if (!validId(req.params.carId)) throw errorWithStatus('Car not found.', 404);
    const adminId = reviewerId(req);
    const result = await agentRequest('/ingest/retry', {
      method: 'POST', body: { carId: req.params.carId, requestedBy: adminId }, timeoutMs: 15000,
    });
    res.status(202).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const approveCar = async (req, res, next) => {
  try {
    if (!validId(req.params.carId)) throw errorWithStatus('Car not found.', 404);
    const adminId = reviewerId(req);
    const car = await Car.findById(req.params.carId).lean();
    if (!car) throw errorWithStatus('Car not found.', 404);
    if (car.reviewStatus !== 'pending') throw errorWithStatus(`This record is already ${car.reviewStatus}.`, 409);

    const category = String(req.body?.category || car.category || '').toLowerCase();
    if (!categories.has(category)) throw errorWithStatus('Choose a valid body category before approving.');
    const notes = String(req.body?.notes || '').trim().slice(0, 1000);
    const overrideReason = String(req.body?.overrideReason || '').trim().slice(0, 1000);
    const needsAttention = car.validation?.recommendation === 'needs_attention';
    if (needsAttention && overrideReason.length < 10) {
      throw errorWithStatus('This record has validation warnings or conflicts. Explain (10+ characters) why it is acceptable to approve.');
    }

    const updated = await Car.findOneAndUpdate(
      { _id: car._id, reviewStatus: 'pending' },
      {
        $set: {
          category,
          reviewStatus: 'approved',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: notes,
          approvalOverrideReason: needsAttention ? overrideReason : '',
          // Images stay linked only if the admin confirms permission to display them.
          ...(req.body?.approveImages === true ? {} : { images: [] }),
        },
      },
      { new: true },
    ).lean();
    if (!updated) throw errorWithStatus('This record was reviewed by someone else.', 409);
    res.json({ success: true, car: updated });
  } catch (error) {
    next(error);
  }
};

export const rejectCar = async (req, res, next) => {
  try {
    if (!validId(req.params.carId)) throw errorWithStatus('Car not found.', 404);
    const adminId = reviewerId(req);
    const notes = String(req.body?.notes || '').trim().slice(0, 1000);
    if (notes.length < 3) throw errorWithStatus('Add a short reason for rejecting this record.');
    const updated = await Car.findOneAndUpdate(
      { _id: req.params.carId, reviewStatus: 'pending' },
      { $set: { reviewStatus: 'rejected', reviewedBy: adminId, reviewedAt: new Date(), reviewNotes: notes } },
      { new: true },
    ).lean();
    if (!updated) throw errorWithStatus('Pending car not found.', 404);
    res.json({ success: true, car: updated });
  } catch (error) {
    next(error);
  }
};

export const createManualCar = async (req, res, next) => {
  try {
    const adminId = reviewerId(req);
    const body = req.body || {};

    const brand = String(body.brand || '').trim();
    const model = String(body.model || '').trim();
    const variant = String(body.variant || '').trim();
    const launchYear = Number(body.launchYear);

    if (!brand || brand.length > 80) {
      throw errorWithStatus('Brand is required and must be 80 characters or fewer.');
    }
    if (!model || model.length > 100) {
      throw errorWithStatus('Model is required and must be 100 characters or fewer.');
    }
    if (variant.length > 120) {
      throw errorWithStatus('Variant must be 120 characters or fewer.');
    }
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(launchYear) || launchYear < 1886 || launchYear > currentYear + 2) {
      throw errorWithStatus(`Model year must be a valid year between 1886 and ${currentYear + 2}.`);
    }

    const isPublish = Boolean(body.publishNow === true || body.action === 'publish');

    let category = body.category ? String(body.category).toLowerCase().trim() : null;
    if (category && !categories.has(category)) {
      throw errorWithStatus('Choose a valid body category (sedan, suv, hatchback, truck, coupe, convertible, electric, hybrid).');
    }
    if (isPublish && !category) {
      throw errorWithStatus('A valid body category is required to publish immediately to the public catalogue.');
    }

    const identityKey = identityKeyFor({ brand, model, variant, launchYear });
    const existing = await Car.findOne({ identityKey }).lean();
    if (existing) {
      throw errorWithStatus(
        `A car with identity "${brand} ${model}${variant ? ` (${variant})` : ''} ${launchYear}" already exists in the database (current status: ${existing.reviewStatus}).`,
        409,
      );
    }

    // Number fields validation (allow null, never invent)
    const parseOptionalNumber = (val, fieldName, { integer = false, min = 0 } = {}) => {
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      if (!Number.isFinite(num) || num < min || (integer && !Number.isInteger(num))) {
        throw errorWithStatus(`${fieldName} must be a valid ${integer ? 'integer' : 'number'} >= ${min}, or left empty.`);
      }
      return num;
    };

    const priceAmount = parseOptionalNumber(body.priceAmount, 'Price', { min: 0 });
    let priceCurrency = '';
    if (priceAmount !== null) {
      priceCurrency = String(body.priceCurrency || 'INR').trim().toUpperCase().slice(0, 3) || 'INR';
    }

    const engine = String(body.engine || '').trim().slice(0, 160);
    const horsepower = parseOptionalNumber(body.horsepower, 'Power / horsepower', { min: 0 });
    const horsepowerUnit = horsepower !== null ? String(body.horsepowerUnit || 'bhp').trim().slice(0, 12) : '';
    const torque = parseOptionalNumber(body.torque, 'Torque', { min: 0 });
    const torqueUnit = torque !== null ? String(body.torqueUnit || 'Nm').trim().slice(0, 12) : '';
    const mileage = parseOptionalNumber(body.mileage, 'Mileage / range', { min: 0 });
    const mileageUnit = mileage !== null ? String(body.mileageUnit || (category === 'electric' ? 'km' : 'kmpl')).trim().slice(0, 20) : '';
    const fuelType = String(body.fuelType || '').trim().slice(0, 40);
    const transmission = String(body.transmission || '').trim().slice(0, 40);
    const seatingCapacity = parseOptionalNumber(body.seatingCapacity, 'Seating capacity', { integer: true, min: 1 });

    // Custom specifications (dimensions, battery, etc.)
    const specifications = {};
    if (body.specifications && typeof body.specifications === 'object' && !Array.isArray(body.specifications)) {
      for (const [k, v] of Object.entries(body.specifications)) {
        const cleanK = String(k || '').trim().slice(0, 80);
        const cleanV = String(v ?? '').trim().slice(0, 300);
        if (cleanK && cleanV) {
          specifications[cleanK] = cleanV;
        }
      }
    }

    // Images
    const rawImages = Array.isArray(body.images) ? body.images : [];
    const images = rawImages
      .map((img) => ({
        url: String(img.url || '').trim(),
        alt: String(img.alt || `${brand} ${model}${variant ? ` ${variant}` : ''}`).trim().slice(0, 200),
        sourceUrl: String(img.sourceUrl || body.sourceUrl || '').trim().slice(0, 2000),
        license: String(img.license || 'Admin verified').trim().slice(0, 200),
        attribution: String(img.attribution || 'Manual entry by administrator').trim().slice(0, 200),
        permissionStatus: 'verified',
      }))
      .filter((img) => Boolean(img.url));

    if (images.length === 0 && body.imageUrl && String(body.imageUrl).trim()) {
      images.push({
        url: String(body.imageUrl).trim(),
        alt: String(body.imageAlt || `${brand} ${model}${variant ? ` ${variant}` : ''}`).trim().slice(0, 200),
        sourceUrl: String(body.imageSourceUrl || body.sourceUrl || '').trim().slice(0, 2000),
        license: String(body.imageLicense || 'Admin verified').trim().slice(0, 200),
        attribution: String(body.imageAttribution || 'Manual entry by administrator').trim().slice(0, 200),
        permissionStatus: 'verified',
      });
    }

    // Source links and attribution
    const sourceUrl = String(body.sourceUrl || '').trim() || 'https://speedhype.com/manual-entry';
    const sourceTitle = String(body.sourceTitle || `${brand} ${model} (Manual Entry)`).trim().slice(0, 300);
    const sourceName = String(body.sourceName || 'Manual Admin Entry').trim().slice(0, 120);
    const sourceLicense = String(body.sourceLicense || 'Manual entry created by administrator').trim().slice(0, 300);
    const sourceLicenseUrl = String(body.sourceLicenseUrl || '').trim().slice(0, 2000);

    const reviewNotes = String(body.reviewNotes || body.notes || '').trim().slice(0, 1000);
    const reviewStatus = isPublish ? 'approved' : 'pending';

    const car = new Car({
      brand,
      model,
      variant,
      launchYear,
      category,
      priceAmount,
      priceCurrency,
      engine,
      horsepower,
      horsepowerUnit,
      torque,
      torqueUnit,
      mileage,
      mileageUnit,
      fuelType,
      transmission,
      seatingCapacity,
      specifications,
      images,
      sourceUrl,
      sourceTitle,
      sourceName,
      sourceLicense,
      sourceLicenseUrl,
      sourceVerifiedAt: new Date(),
      fieldSources: {},
      identityKey,
      ingestionUpdatedAt: new Date(),
      reviewStatus,
      reviewedBy: isPublish ? adminId : null,
      reviewedAt: isPublish ? new Date() : null,
      reviewNotes: reviewNotes || (isPublish ? 'Manually entered and published by admin.' : 'Manually entered by admin.'),
      approvalOverrideReason: '',
      editedBy: adminId,
      editedAt: new Date(),
      editedFields: ['manual_creation'],
      validation: {
        recommendation: isPublish ? 'manual_published' : 'manual_pending',
        issues: [],
        fieldStatus: {},
        conflicts: [],
      },
      sources: [{
        url: sourceUrl,
        title: sourceTitle,
        domain: 'manual',
        tier: 'primary',
        retrievedAt: new Date(),
      }],
      ingestionRunId: null,
      ingestedBy: `manual-admin-${adminId}`,
    });

    const saved = await car.save();
    res.status(201).json({
      success: true,
      car: saved.toObject(),
      message: isPublish
        ? `${brand} ${model} created and published to the public catalogue!`
        : `${brand} ${model} saved as pending review.`,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorWithStatus('A vehicle with this brand, model, variant, and year already exists in the database.', 409));
    }
    next(error);
  }
};

export const uploadCatalogCarImage = async (req, res, next) => {
  try {
    reviewerId(req);
    if (!req.file) throw errorWithStatus('No image file was uploaded.', 400);
    if (!isCloudinaryConfigured()) {
      throw errorWithStatus('Cloudinary is not configured on the server. Please enter a direct image URL.', 503);
    }
    const result = await uploadCarImage(req.file);
    res.json({ success: true, url: result.url, publicId: result.publicId });
  } catch (error) {
    next(error);
  }
};


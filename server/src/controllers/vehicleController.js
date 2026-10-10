import { getAuth, clerkClient } from '@clerk/express';
import Vehicle from '../models/Vehicle.js';

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const listVehicles = async (_req, res, next) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, vehicles });
  } catch (error) {
    next(error);
  }
};

export const addVehicle = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const make = String(req.body.make || '').trim();
    const model = String(req.body.model || '').trim();
    const category = String(req.body.category || '').trim();
    const year = Number(req.body.year);
    const summary = String(req.body.summary || '').trim();
    const imageUrl = String(req.body.imageUrl || '').trim();
    const launchDate = req.body.launchDate ? new Date(req.body.launchDate) : new Date();

    if (!make || make.length > 60) throw createError('Make is required and must be 60 characters or fewer.');
    if (!model || model.length > 80) throw createError('Model is required and must be 80 characters or fewer.');
    if (!Number.isInteger(year) || year < 1886 || year > 2200) throw createError('Enter a valid model year.');
    if (!category || category.length > 48) throw createError('Category is required and must be 48 characters or fewer.');
    if (summary.length > 400) throw createError('Summary must be 400 characters or fewer.');
    if (imageUrl && !URL.canParse(imageUrl)) throw createError('Image URL must be valid.');
    if (Number.isNaN(launchDate.getTime())) throw createError('Launch date must be a valid date.');

    const user = await clerkClient.users.getUser(userId);
    const vehicle = await Vehicle.create({
      make,
      model,
      category,
      year,
      summary,
      imageUrl,
      launchDate,
      addedBy: userId,
    });

    res.status(201).json({ success: true, vehicle, addedByName: user.fullName || user.username || 'SpeedHype member' });
  } catch (error) {
    next(error);
  }
};

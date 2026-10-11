import { getAuth } from '@clerk/express';

const adminUserIds = () => new Set(
  (process.env.CAR_CATALOG_ADMIN_USER_IDS || '')
    .split(',')
    .map((userId) => userId.trim())
    .filter(Boolean),
);

export const isCatalogAdmin = (req) => {
  const { userId } = getAuth(req);
  return Boolean(userId && adminUserIds().has(userId));
};

export const requireCatalogAdmin = (req, _res, next) => {
  if (!isCatalogAdmin(req)) {
    const error = new Error('Catalog administrator access is required.');
    error.statusCode = 403;
    return next(error);
  }
  return next();
};

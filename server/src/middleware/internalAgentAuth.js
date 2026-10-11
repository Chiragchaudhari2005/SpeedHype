import { timingSafeEqual } from 'node:crypto';

export const requireInternalAgent = (req, _res, next) => {
  const configuredSecret = process.env.CAR_INGESTION_SHARED_SECRET || '';
  const suppliedSecret = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const configured = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);

  if (
    !configuredSecret
    || configured.length !== supplied.length
    || !timingSafeEqual(configured, supplied)
  ) {
    const error = new Error('Valid internal agent credentials are required.');
    error.statusCode = 401;
    return next(error);
  }

  return next();
};

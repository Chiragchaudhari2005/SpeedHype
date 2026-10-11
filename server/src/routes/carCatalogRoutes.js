import express from 'express';
import multer from 'multer';
import {
  compareCatalogCars,
  getCatalogCar,
  getCatalogPermissions,
  getIngestionStatus,
  ingestCatalogCars,
  listCatalogCars,
  triggerIngestion,
} from '../controllers/carCatalogController.js';
import {
  approveCar,
  createManualCar,
  getIngestionRun,
  getReviewCounts,
  listIngestionRuns,
  listReviewCars,
  rejectCar,
  retryReviewCar,
  updateReviewCar,
  uploadCatalogCarImage,
} from '../controllers/carReviewController.js';
import { requireCatalogAdmin } from '../middleware/catalogAdmin.js';
import { requireInternalAgent } from '../middleware/internalAgentAuth.js';

const router = express.Router();
const uploadCarImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) {
      const error = new Error('Car image must be a JPG, PNG, WebP, or AVIF image.');
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

// Public (signed-in) catalog: approved records only.
router.get('/', listCatalogCars);
router.get('/permissions', getCatalogPermissions);

// Admin-only: Clerk session verified by the app-level middleware, admin allow-list enforced server-side.
router.get('/ingestion/status', requireCatalogAdmin, getIngestionStatus);
router.post('/ingestion/trigger', requireCatalogAdmin, triggerIngestion);
router.get('/ingestion/runs', requireCatalogAdmin, listIngestionRuns);
router.get('/ingestion/runs/:runId', requireCatalogAdmin, getIngestionRun);
router.get('/review', requireCatalogAdmin, listReviewCars);
router.get('/review/counts', requireCatalogAdmin, getReviewCounts);
router.patch('/review/:carId', requireCatalogAdmin, updateReviewCar);
router.post('/review/:carId/approve', requireCatalogAdmin, approveCar);
router.post('/review/:carId/reject', requireCatalogAdmin, rejectCar);
router.post('/review/:carId/retry', requireCatalogAdmin, retryReviewCar);
router.post('/review/manual', requireCatalogAdmin, createManualCar);
router.post('/upload-image', requireCatalogAdmin, uploadCarImageMiddleware.single('image'), uploadCatalogCarImage);

// Legacy server-to-server push endpoint (shared secret only).
router.post('/ingestion/records', requireInternalAgent, ingestCatalogCars);

router.get('/compare', compareCatalogCars);
router.get('/:carId', getCatalogCar);

export default router;

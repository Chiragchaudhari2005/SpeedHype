import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { addVehicle, listVehicles } from '../controllers/vehicleController.js';

const router = express.Router();
router.use(requireAuth());
router.get('/', listVehicles);
router.post('/', addVehicle);

export default router;

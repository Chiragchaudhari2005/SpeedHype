import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getFeed, getDashboard, getNotifications, markNotificationsRead } from '../controllers/feedController.js';

const router = express.Router();
router.use(requireAuth());
router.get('/', getFeed);
router.get('/dashboard', getDashboard);
router.get('/notifications', getNotifications);
router.post('/notifications/read', markNotificationsRead);

export default router;

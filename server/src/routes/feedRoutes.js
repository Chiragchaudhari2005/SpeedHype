import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getFeed, getNotifications, markNotificationsRead } from '../controllers/feedController.js';

const router = express.Router();
router.use(requireAuth());
router.get('/', getFeed);
router.get('/notifications', getNotifications);
router.post('/notifications/read', markNotificationsRead);

export default router;

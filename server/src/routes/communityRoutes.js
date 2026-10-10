import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  createCommunity,
  deleteCommunity,
  getCommunityDetails,
  getCommunityMessages,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  updateCommunity,
} from '../controllers/communityController.js';

const router = express.Router();
const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) {
      const error = new Error('Community covers must be JPG, PNG, WebP, or AVIF images.');
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

router.use(requireAuth());
router.get('/', listCommunities);
router.post('/', uploadCover.single('coverImage'), createCommunity);
router.get('/:communityId', getCommunityDetails);
router.put('/:communityId', uploadCover.single('coverImage'), updateCommunity);
router.delete('/:communityId', deleteCommunity);
router.post('/:communityId/join', joinCommunity);
router.post('/:communityId/leave', leaveCommunity);
router.get('/:communityId/messages', getCommunityMessages);

export default router;

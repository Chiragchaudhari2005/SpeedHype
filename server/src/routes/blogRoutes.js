import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  createBlog,
  deleteBlog,
  getBlog,
  listBlogs,
  updateBlog,
} from '../controllers/blogController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.mimetype)) {
      const error = new Error('Only JPG, PNG, WebP, AVIF, and GIF images can be uploaded.');
      error.statusCode = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

const blogImages = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 5 },
]);

router.get('/', listBlogs);
router.get('/:blogId', getBlog);
router.post('/', requireAuth(), blogImages, createBlog);
router.put('/:blogId', requireAuth(), blogImages, updateBlog);
router.delete('/:blogId', requireAuth(), deleteBlog);

export default router;

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user information
 * @access  Private
 */
router.get('/me', requireAuth(), (req, res) => {
    try {
        // req.auth is populated by Clerk middleware
        const user = req.auth;
        
        res.status(200).json({
            success: true,
            user: {
                id: user.userId,
                // Add other Clerk user info if needed
                sessionId: user.sessionId,
                orgId: user.orgId,
            }
        });
    } catch (error) {
        console.error('Error in /api/auth/me:', error);
        res.status(500).json({
            success: false,
            message: 'Server error retrieving user information'
        });
    }
});

export default router;
import { clerkMiddleware, requireAuth } from '@clerk/express';

export const clerkAuthMiddleware = clerkMiddleware();

// Export requireAuth for protected routes
export { requireAuth };
const express = require('express');
const {
  getAllPosts,
  getMyPosts,
  getPostById,
  createPost,
  updatePost,
  getNearbyPosts,
  markResolved,
  deletePost,
} = require('../controllers/lostfound.controller');
const verifyToken = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Public routes
 */

/**
 * GET /api/lost-found
 * Get all active lost & found posts with optional filtering.
 * Query params: type, district, status, page, limit, search
 */
router.get('/', asyncHandler(getAllPosts));

/**
 * Private routes
 */

/**
 * GET /api/lost-found/my
 * Get posts created by the current user.
 * Requires: authentication
 */
router.get('/my', verifyToken, asyncHandler(getMyPosts));

/**
 * GET /api/lost-found/nearby
 * Get active lost & found posts near a coordinate.
 */
router.get('/nearby', verifyToken, asyncHandler(getNearbyPosts));

/**
 * GET /api/lost-found/:id
 * Get a single post by ID.
 * Contact info hidden unless showContact is true or user is owner.
 * Requires: authentication
 */
router.get('/:id', verifyToken, asyncHandler(getPostById));

/**
 * POST /api/lost-found
 * Create a new lost & found post.
 * Requires: authentication + active user
 */
router.post(
  '/',
  verifyToken,
  roleCheck.requireActiveUser,
  asyncHandler(createPost)
);

/**
 * PUT /api/lost-found/:id
 * Update a lost & found post.
 * Only active posts can be updated. Check ownership or admin.
 * Requires: authentication + ownership or admin
 */
router.put('/:id', verifyToken, asyncHandler(updatePost));

/**
 * PATCH /api/lost-found/:id/resolve
 * Mark a post as resolved.
 * Requires: authentication + ownership or admin
 */
router.patch('/:id/resolve', verifyToken, asyncHandler(markResolved));

/**
 * DELETE /api/lost-found/:id
 * Delete a lost & found post.
 * Requires: authentication + ownership or admin
 */
router.delete('/:id', verifyToken, asyncHandler(deletePost));

module.exports = router;

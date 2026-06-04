const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateMyProfile,
  updateUserStatus,
  updateUserRole,
  deleteUser,
} = require('../controllers/user.controller');
const verifyToken = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/roleCheck');

const router = express.Router();

/**
 * Async error handler wrapper for Express route handlers.
 * @param {Function} fn - The async route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * ==========================================
 * ADMIN ENDPOINTS
 * ==========================================
 */

/**
 * GET /api/users
 * Get all users with filtering, searching, and pagination.
 * Admin only.
 * Query: status, role, search, page, limit
 * Response: { success, users, totalCount, totalPages, currentPage }
 */
router.get('/', verifyToken, requireAdmin, asyncHandler(getAllUsers));

/**
 * PATCH /api/users/profile
 * Update logged-in user's own profile.
 * Private (any authenticated user).
 * Body: { name, avatar, phone, division, district, upazila }
 * Note: Email updates are not allowed and will be ignored.
 * Response: { success, user }
 */
router.patch('/profile', verifyToken, asyncHandler(updateMyProfile));

/**
 * GET /api/users/:id
 * Get a specific user by ID.
 * Admin only.
 * Response: { success, user }
 */
router.get('/:id', verifyToken, requireAdmin, asyncHandler(getUserById));

/**
 * PATCH /api/users/:id/status
 * Update user status (active/blocked).
 * Admin only.
 * Body: { status }
 * Response: { success, user }
 */
router.patch('/:id/status', verifyToken, requireAdmin, asyncHandler(updateUserStatus));

/**
 * PATCH /api/users/:id/role
 * Update user role (user/moderator/admin).
 * Admin only.
 * Body: { role }
 * Response: { success, user }
 */
router.patch('/:id/role', verifyToken, requireAdmin, asyncHandler(updateUserRole));

/**
 * DELETE /api/users/:id
 * Delete a user and cascade delete their incidents and lost-found posts.
 * Admin only.
 * Response: { success, message }
 */
router.delete('/:id', verifyToken, requireAdmin, asyncHandler(deleteUser));

/**
 * ==========================================
 * PRIVATE ENDPOINTS
 * ==========================================
 */

/**
 * PATCH /api/users/profile
 * Update logged-in user's own profile.
 * Private (any authenticated user).
 * Body: { name, avatar, phone, division, district, upazila }
 * Note: Email updates are not allowed and will be ignored.
 * Response: { success, user }
 */
router.patch('/profile', verifyToken, asyncHandler(updateMyProfile));

module.exports = router;

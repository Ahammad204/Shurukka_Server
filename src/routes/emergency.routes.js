const express = require('express');
const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  seedContacts,
} = require('../controllers/emergency.controller');
const verifyToken = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Public routes
 */

/**
 * GET /api/emergency-contacts
 * Get all emergency contacts with optional filtering.
 * Query params: district, category, division, search, page, limit
 * National contacts always appear first.
 */
router.get('/', asyncHandler(getContacts));

/**
 * GET /api/emergency-contacts/:id
 * Get a single emergency contact by ID.
 */
router.get('/:id', asyncHandler(getContactById));

/**
 * Admin routes
 */

/**
 * POST /api/emergency-contacts
 * Create a new emergency contact.
 * Requires: admin role
 */
router.post('/', verifyToken, roleCheck.requireAdmin, asyncHandler(createContact));

/**
 * PUT /api/emergency-contacts/:id
 * Update an emergency contact.
 * Requires: admin role
 */
router.put('/:id', verifyToken, roleCheck.requireAdmin, asyncHandler(updateContact));

/**
 * DELETE /api/emergency-contacts/:id
 * Delete an emergency contact.
 * Requires: admin role
 */
router.delete('/:id', verifyToken, roleCheck.requireAdmin, asyncHandler(deleteContact));

/**
 * POST /api/emergency-contacts/seed
 * Seed the database with initial emergency contacts.
 * Requires: admin role
 */
router.post('/seed', verifyToken, roleCheck.requireAdmin, asyncHandler(seedContacts));

module.exports = router;

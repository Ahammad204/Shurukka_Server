const express = require('express');
const {
  getIncidents,
  getMyIncidents,
  getIncidentById,
  createIncident,
  updateIncident,
  deleteIncident,
  updateStatus,
  flagIncident,
  getNearbyIncidents,
} = require('../controllers/incident.controller');
const verifyToken = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Public routes
 */

/**
 * GET /api/incidents
 * Get all verified incidents with optional filtering.
 * Query params: category, district, upazila, status (default: verified, use status=all to return all statuses), page, limit, search
 */
router.get('/', asyncHandler(getIncidents));

/**
 * Private routes
 */

/**
 * GET /api/incidents/my
 * Get incidents reported by the current user.
 * Requires: authentication
 */
router.get('/my', verifyToken, asyncHandler(getMyIncidents));

/**
 * GET /api/incidents/nearby
 * Get verified incidents near a coordinate.
 */
router.get('/nearby', verifyToken, asyncHandler(getNearbyIncidents));

/**
 * GET /api/incidents/:id
 * Get a single incident by ID.
 * Requires: authentication
 */
router.get('/:id', verifyToken, asyncHandler(getIncidentById));

/**
 * POST /api/incidents
 * Create a new incident report.
 * Requires: authentication + active user
 */
router.post(
  '/',
  verifyToken,
  roleCheck.requireActiveUser,
  asyncHandler(createIncident)
);

/**
 * PUT /api/incidents/:id
 * Update an incident report.
 * Requires: authentication + active user + ownership or admin
 */
router.put(
  '/:id',
  verifyToken,
  roleCheck.requireActiveUser,
  asyncHandler(updateIncident)
);

/**
 * DELETE /api/incidents/:id
 * Delete an incident report.
 * Requires: authentication + ownership or admin
 */
router.delete('/:id', verifyToken, asyncHandler(deleteIncident));

/**
 * PATCH /api/incidents/:id/status
 * Update incident status (moderator/admin only).
 * Requires: authentication + moderator or admin
 */
router.patch(
  '/:id/status',
  verifyToken,
  roleCheck.requireModerator,
  asyncHandler(updateStatus)
);

/**
 * PATCH /api/incidents/:id/flag
 * Flag an incident report as suspicious.
 * Requires: authentication
 */
router.patch('/:id/flag', verifyToken, asyncHandler(flagIncident));

module.exports = router;

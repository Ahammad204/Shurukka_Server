const express = require('express');
const {
  getPublicStats,
  getAdminStats,
} = require('../controllers/stats.controller');
const verifyToken = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/roleCheck');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/stats/public
 * Public home page counters.
 */
router.get('/public', asyncHandler(getPublicStats));

/**
 * GET /api/stats/admin
 * Admin-only statistics.
 */
router.get('/admin', verifyToken, requireAdmin, asyncHandler(getAdminStats));

module.exports = router;

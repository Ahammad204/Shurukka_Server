/**
 * Role-based middleware utilities.
 */

/**
 * Generic role check middleware.
 * @param {string} role - The required role
 * @returns {function} Express middleware function
 */
const roleCheck = (role) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Access denied' });
    if (req.user.role !== role) return res.status(403).json({ success: false, message: `${role} access required` });
    return next();
  };
};

/**
 * Require admin role.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
  return next();
};

/**
 * Require moderator or admin.
 */
const requireModerator = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied' });
  if (req.user.role !== 'moderator' && req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Moderator access required' });
  return next();
};

/**
 * Require that the user's status is active.
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied' });
  if (req.user.status !== 'active') return res.status(403).json({ success: false, message: 'Blocked users cannot perform this action' });
  return next();
};

module.exports = roleCheck;
module.exports.requireAdmin = requireAdmin;
module.exports.requireModerator = requireModerator;
module.exports.requireActiveUser = requireActiveUser;

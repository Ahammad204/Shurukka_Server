const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token middleware.
 * Extracts token from `Authorization: Bearer <token>` header.
 * Attaches the user document to `req.user` if valid.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Account is blocked' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = verifyToken;

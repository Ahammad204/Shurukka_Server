const mongoose = require('mongoose');
const User = require('../models/User');
const Incident = require('../models/Incident');
const LostFound = require('../models/LostFound');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * ==========================================
 * ADMIN ENDPOINTS
 * ==========================================
 */

/**
 * Get all users with filtering, searching, and pagination.
 *
 * **Access**: Admin only
 *
 * **Query Parameters**:
 * - status: 'active' or 'blocked' (optional)
 * - role: 'user', 'moderator', or 'admin' (optional)
 * - search: search by name or email (optional)
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 *
 * **Response** (200):
 * ```json
 * {
 *   "success": true,
 *   "users": [
 *     {
 *       "_id": "...",
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "role": "user",
 *       "status": "active",
 *       "phone": "...",
 *       "division": "...",
 *       "createdAt": "2026-05-28T10:30:00Z"
 *     }
 *   ],
 *   "totalCount": 50,
 *   "totalPages": 5,
 *   "currentPage": 1
 * }
 * ```
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { status, role, search, page = 1, limit = 10 } = req.query;

    // Validate and sanitize pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build dynamic filter
    const filter = {};

    // Add status filter if provided
    if (status && ['active', 'blocked'].includes(status)) {
      filter.status = status;
    }

    // Add role filter if provided
    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      filter.role = role;
    }

    // Add search filter (name or email)
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    // Query users with filter
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.json({
      success: true,
      users,
      totalCount,
      totalPages,
      currentPage: pageNum,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get a specific user by ID.
 *
 * **Access**: Admin only
 *
 * **Path Parameters**:
 * - id: User ID
 *
 * **Response** (200):
 * ```json
 * {
 *   "success": true,
 *   "user": {
 *     "_id": "...",
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "role": "user",
 *     "status": "active",
 *     "phone": "...",
 *     "division": "...",
 *     "district": "...",
 *     "upazila": "...",
 *     "reportCount": 5,
 *     "rejectedCount": 0,
 *     "createdAt": "2026-05-28T10:30:00Z"
 *   }
 * }
 * ```
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update logged-in user's own profile.
 *
 * **Access**: Private (any authenticated user)
 *
 * **Request Body**:
 * ```json
 * {
 *   "name": "John Doe",
 *   "avatar": "https://...",
 *   "phone": "01700000000",
 *   "division": "Dhaka",
 *   "district": "Dhaka",
 *   "upazila": "Mirpur"
 * }
 * ```
 *
 * **Response** (200):
 * ```json
 * {
 *   "success": true,
 *   "user": { ... updated user }
 * }
 * ```
 *
 * **Important Notes**:
 * - Email cannot be changed via this endpoint (will be ignored if provided)
 * - Only name is required for update
 * - Password changes are not allowed here (separate endpoint needed)
 * - Returns updated user with all fields except passwordHash
 *
 * **Errors**:
 * - 400: Name is required or empty
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { name, avatar, phone, division, district, upazila } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and cannot be empty',
      });
    }

    const updateData = {
      name: name.trim(),
    };

    if (avatar !== undefined) updateData.avatar = avatar;
    if (phone !== undefined) updateData.phone = phone;
    if (division !== undefined) updateData.division = division;
    if (district !== undefined) updateData.district = district;
    if (upazila !== undefined) updateData.upazila = upazila;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update user status (active/blocked).
 *
 * **Access**: Admin only
 *
 * **Path Parameters**:
 * - id: User ID
 *
 * **Request Body**:
 * ```json
 * {
 *   "status": "blocked"
 * }
 * ```
 *
 * **Response** (200):
 * ```json
 * {
 *   "success": true,
 *   "user": { ... updated user }
 * }
 * ```
 *
 * **Important Notes**:
 * - Status must be 'active' or 'blocked'
 * - Admin cannot block themselves
 * - Returns updated user
 *
 * **Errors**:
 * - 400: Invalid status value
 * - 400: Cannot block yourself
 * - 404: User not found
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    if (!status || !['active', 'blocked'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "active" or "blocked"',
      });
    }

    if (id === req.user._id.toString() && status === 'blocked') {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

/**
 * Update user role (user/moderator/admin).
 *
 * **Access**: Admin only
 *
 * **Path Parameters**:
 * - id: User ID
 *
 * **Request Body**:
 * ```json
 * {
 *   "role": "moderator"
 * }
 * ```
 *
 * **Response** (200):
 * ```json
 * {
 *   "success": true,
 *   "user": { ... updated user }
 * }
 * ```
 *
 * **Important Notes**:
 * - Role must be 'user', 'moderator', or 'admin'
 * - Admin cannot change their own role
 * - Returns updated user
 *
 * **Errors**:
 * - 400: Invalid role value
 * - 400: Cannot change your own role
 * - 404: User not found
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be "user", "moderator", or "admin"',
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete a user and cascade delete their incidents and lost-found posts.
 *
 * **Access**: Admin only
 *
 * **Path Parameters**:
 * - id: User ID
 *
 * **Response** (200):
 * ```json
 * {
 *   "success": true,
 *   "message": "User and associated data deleted successfully",
 *   "deletedIncidents": 5,
 *   "deletedLostFound": 3
 * }
 * ```
 *
 * **Important Notes**:
 * - Admin cannot delete themselves
 * - Cascades delete all incidents and lost-found posts by this user
 * - This is a permanent action
 *
 * **Errors**:
 * - 400: Cannot delete yourself
 * - 404: User not found
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete yourself',
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const incidentsResult = await Incident.deleteMany({ reporterId: id });
    const lostFoundResult = await LostFound.deleteMany({ userId: id });

    await User.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'User and associated data deleted successfully',
      deletedIncidents: incidentsResult.deletedCount,
      deletedLostFound: lostFoundResult.deletedCount,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateMyProfile,
  updateUserStatus,
  updateUserRole,
  deleteUser,
};
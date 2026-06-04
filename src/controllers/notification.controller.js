const Notification = require('../models/Notification');

/**
 * Get all notifications for the logged-in user.
 * Supports pagination and returns unread count.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id || req.user._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipientId: userId }),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    res.json({
      success: true,
      notifications,
      totalCount,
      unreadCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get the unread notifications count for the logged-in user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id || req.user._id;
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    res.json({ success: true, unreadCount });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark a single notification as read.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id || req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark all notifications as read for the logged-in user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function markAllAsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id || req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a single notification for the logged-in user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function deleteNotification(req, res, next) {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user.id || req.user._id,
    });

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete all notifications for the logged-in user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function clearAllNotifications(req, res, next) {
  try {
    const result = await Notification.deleteMany({ recipientId: req.user.id || req.user._id });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};

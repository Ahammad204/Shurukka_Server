const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Creates notifications for all active users except the sender.
 * Used when new incident or lost & found content is created.
 * @param {Object} options
 * @param {string} options.senderId
 * @param {string} options.senderName
 * @param {string} options.senderAvatar
 * @param {string} options.type
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} options.link
 * @param {string} options.referenceId
 * @param {string} options.referenceType
 */
async function createNotificationsForAllUsers({
  senderId,
  senderName,
  senderAvatar,
  type,
  title,
  message,
  link,
  referenceId,
  referenceType,
}) {
  const recipients = await User.find(
    { _id: { $ne: senderId }, status: 'active' },
    { _id: 1 }
  ).lean();

  if (recipients.length === 0) {
    return;
  }

  const notifications = recipients.map((user) => ({
    recipientId: user._id,
    senderId,
    senderName,
    senderAvatar,
    type,
    title,
    message,
    link,
    referenceId,
    referenceType,
    isRead: false,
    createdAt: new Date(),
  }));

  await Notification.insertMany(notifications, { ordered: false });
}

/**
 * Creates a notification for a single user.
 * Used for status updates on incidents and lost & found posts.
 * @param {Object} options
 * @param {string} options.recipientId
 * @param {string} options.senderId
 * @param {string} options.senderName
 * @param {string} options.senderAvatar
 * @param {string} options.type
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} options.link
 * @param {string} options.referenceId
 * @param {string} options.referenceType
 */
async function createNotificationForUser({
  recipientId,
  senderId,
  senderName,
  senderAvatar,
  type,
  title,
  message,
  link,
  referenceId,
  referenceType,
}) {
  await Notification.create({
    recipientId,
    senderId,
    senderName,
    senderAvatar,
    type,
    title,
    message,
    link,
    referenceId,
    referenceType,
  });
}

module.exports = {
  createNotificationsForAllUsers,
  createNotificationForUser,
};

const User = require('../models/User');
const Incident = require('../models/Incident');

/**
 * ==========================================
 * CONTENT MODERATION AUTO-TASKS
 * ==========================================
 *
 * These functions automate moderation tasks:
 * 1. Archive expired verified incidents
 * 2. Block users with high rejection count
 *
 * Usage with node-cron:
 * const cron = require('node-cron');
 * const { autoArchiveExpiredIncidents, checkAndPenalizeUsers } = require('./utils/autoModerate');
 *
 * // Run at midnight every day (0 0 * * *)
 * cron.schedule('0 0 * * *', async () => {
 *   await autoArchiveExpiredIncidents();
 *   await checkAndPenalizeUsers();
 * });
 *
 * Or run on startup once:
 * (async () => {
 *   await autoArchiveExpiredIncidents();
 *   await checkAndPenalizeUsers();
 * })();
 */

/**
 * Automatically archive expired incidents.
 *
 * **Purpose**: Archive verified incidents that have exceeded 30-day visibility.
 *
 * **Logic**:
 * - Find all incidents where:
 *   - status === 'verified'
 *   - expiresAt < current time
 * - Update them to status: 'archived'
 * - Log count of archived incidents
 *
 * **Response**:
 * - Returns count of archived incidents
 * - Logs result to console
 *
 * **When to call**:
 * - Daily via cron (recommended: midnight)
 * - Manually: await autoArchiveExpiredIncidents()
 *
 * **Side effects**:
 * - Updates Incident documents
 * - Logs to console
 *
 * @returns {Promise<number>} Count of archived incidents
 * @example
 * // Via cron
 * const cron = require('node-cron');
 * cron.schedule('0 0 * * *', autoArchiveExpiredIncidents);
 *
 * @example
 * // Manual call
 * const { autoArchiveExpiredIncidents } = require('./utils/autoModerate');
 * const count = await autoArchiveExpiredIncidents();
 * console.log(`Archived ${count} incidents`);
 */
async function autoArchiveExpiredIncidents() {
  try {
    // Find all verified incidents that have expired
    const result = await Incident.updateMany(
      {
        status: 'verified',
        expiresAt: { $lt: new Date() },
      },
      {
        status: 'archived',
      }
    );

    const archivedCount = result.modifiedCount;

    console.log(
      `[AutoModerate] Archived ${archivedCount} expired incidents at ${new Date().toISOString()}`
    );

    return archivedCount;
  } catch (err) {
    console.error('[AutoModerate] Error archiving expired incidents:', err);
    throw err;
  }
}

/**
 * Automatically block users with high rejection count.
 *
 * **Purpose**: Prevent misuse by auto-blocking users who repeatedly submit rejected reports.
 *
 * **Logic**:
 * - Find all users where:
 *   - rejectedCount >= 5
 *   - status === 'active'
 * - Automatically set status to 'blocked'
 * - Log blocked users to console
 *
 * **Response**:
 * - Returns count of blocked users
 * - Logs result to console
 * - Logs individual user info (name, email, rejectedCount)
 *
 * **When to call**:
 * - Daily via cron (alongside autoArchiveExpiredIncidents)
 * - Manually: await checkAndPenalizeUsers()
 *
 * **Threshold**:
 * - 5 rejections = auto-block
 * - Configurable by changing the >= 5 condition
 *
 * **Side effects**:
 * - Updates User documents (status: 'blocked')
 * - Logs to console
 *
 * @returns {Promise<number>} Count of blocked users
 * @example
 * // Via cron
 * const cron = require('node-cron');
 * cron.schedule('0 0 * * *', checkAndPenalizeUsers);
 *
 * @example
 * // Manual call
 * const { checkAndPenalizeUsers } = require('./utils/autoModerate');
 * const count = await checkAndPenalizeUsers();
 * console.log(`Blocked ${count} users for high rejection count`);
 */
async function checkAndPenalizeUsers() {
  try {
    // Find users with high rejection count who are still active
    const penalizedUsers = await User.find({
      rejectedCount: { $gte: 5 },
      status: 'active',
    });

    if (penalizedUsers.length === 0) {
      console.log('[AutoModerate] No users to penalize at', new Date().toISOString());
      return 0;
    }

    // Extract user IDs for bulk update
    const userIds = penalizedUsers.map((u) => u._id);

    // Block all these users
    const result = await User.updateMany(
      {
        _id: { $in: userIds },
      },
      {
        status: 'blocked',
      }
    );

    const blockedCount = result.modifiedCount;

    // Log each blocked user
    console.log(
      `[AutoModerate] Blocked ${blockedCount} users at ${new Date().toISOString()}`
    );

    penalizedUsers.forEach((user) => {
      console.log(
        `  - User: ${user.name} (${user.email}) with ${user.rejectedCount} rejections`
      );
    });

    return blockedCount;
  } catch (err) {
    console.error('[AutoModerate] Error penalizing users:', err);
    throw err;
  }
}

module.exports = {
  autoArchiveExpiredIncidents,
  checkAndPenalizeUsers,
};

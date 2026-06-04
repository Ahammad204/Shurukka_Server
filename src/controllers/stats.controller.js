const Incident = require('../models/Incident');
const LostFound = require('../models/LostFound');
const User = require('../models/User');

/**
 * Build a zero-filled monthly incident summary for the last 6 months.
 * @param {Array<{year:number,month:number,count:number}>} rows
 * @returns {Array<{year:number,month:number,count:number}>}
 */
const buildMonthlyIncidents = (rows) => {
  const now = new Date();
  const months = [];
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

  for (let i = 0; i < 6; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1, 0, 0, 0, 0);
    months.push({ year: date.getFullYear(), month: date.getMonth() + 1, count: 0 });
  }

  const lookup = rows.reduce((acc, row) => {
    acc[`${row.year}-${row.month}`] = row.count;
    return acc;
  }, {});

  return months.map((entry) => ({
    year: entry.year,
    month: entry.month,
    count: lookup[`${entry.year}-${entry.month}`] || 0,
  }));
};

/**
 * Get public statistics for the home page.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getPublicStats = async (req, res, next) => {
  try {
    const [verifiedIncidents, totalMapIncidents, activeLostFound, totalUsers] = await Promise.all([
      Incident.countDocuments({ status: 'verified' }),
      Incident.countDocuments({ status: 'verified', hasMapLocation: true }),
      LostFound.countDocuments({ status: 'active' }),
      User.countDocuments(),
    ]);

    return res.json({
      success: true,
      verifiedIncidents,
      totalMapIncidents,
      activeLostFound,
      totalUsers,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get admin-level statistics for the dashboard.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const getAdminStats = async (req, res, next) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
      totalUsers,
      pendingIncidents,
      verifiedIncidents,
      totalIncidents,
      totalMapIncidents,
      activeLostFound,
      incidentsByCategory,
      incidentsByStatus,
      monthlyIncidentsRows,
      newUsersThisMonth,
      recentIncidents,
      recentLostFound,
    ] = await Promise.all([
      User.countDocuments(),
      Incident.countDocuments({ status: 'pending' }),
      Incident.countDocuments({ status: 'verified' }),
      Incident.countDocuments(),
      Incident.countDocuments({ hasMapLocation: true }),
      LostFound.countDocuments({ status: 'active' }),
      Incident.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { _id: 0, category: '$_id', count: 1 } },
      ]),
      Incident.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ]),
      Incident.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            count: 1,
          },
        },
        { $sort: { year: 1, month: 1 } },
      ]),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
      Incident.find().sort({ createdAt: -1 }).limit(5).lean(),
      LostFound.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        pendingIncidents,
        verifiedIncidents,
        totalIncidents,
        totalMapIncidents,
        activeLostFound,
        incidentsByCategory,
        incidentsByStatus,
        monthlyIncidents: buildMonthlyIncidents(monthlyIncidentsRows),
        newUsersThisMonth,
        recentIncidents: recentIncidents || [],
        recentLostFound: recentLostFound || [],
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getPublicStats,
  getAdminStats,
};
